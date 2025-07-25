"use server";

import { db } from "@/db";
import { courseWeeks, courses, cuecards, userProgress } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { and, eq, inArray } from "drizzle-orm";

// Import types from centralized database types
import type { Cuecard } from "@/types/database-types";
import type { SelectiveGenerationConfig } from "@/types/generation-types";

// Types for cuecards data - extended with week information
export type UserCuecard = Cuecard & {
	weekNumber: number;
};

/**
 * Get user's generated cuecards for a specific course and weeks
 * Includes RLS protection through course ownership verification
 */
export async function getUserCuecards(
	courseId: string,
	weekIds?: string[]
): Promise<UserCuecard[]> {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			// Build base query with RLS protection through course ownership
			const whereConditions = [
				eq(courses.userId, user.id), // RLS protection
				eq(cuecards.courseId, courseId),
			];

			// Add week filter if provided
			if (weekIds && weekIds.length > 0 && !weekIds.includes("all-weeks")) {
				whereConditions.push(inArray(cuecards.weekId, weekIds));
			}

			const results = await db
				.select({
					id: cuecards.id,
					courseId: cuecards.courseId,
					weekId: cuecards.weekId,
					weekNumber: courseWeeks.weekNumber,
					question: cuecards.question,
					answer: cuecards.answer,
					difficulty: cuecards.difficulty,
					metadata: cuecards.metadata,
					createdAt: cuecards.createdAt,
					updatedAt: cuecards.updatedAt,
				})
				.from(cuecards)
				.innerJoin(courses, eq(cuecards.courseId, courses.id))
				.innerJoin(courseWeeks, eq(cuecards.weekId, courseWeeks.id))
				.where(and(...whereConditions))
				.orderBy(cuecards.createdAt);

			return results;
		},
		"getUserCuecards",
		[] // fallback to empty array
	);
}

/**
 * Check if cuecards are available for a course/weeks combination
 */
export async function checkCuecardsAvailability(
	courseId: string,
	weekIds?: string[]
): Promise<{
	available: boolean;
	count: number;
	hasWeeksWithContent: boolean;
}> {
	return await withErrorHandling(
		async () => {
			const cuecards = await getUserCuecards(courseId, weekIds);

			// Check if there are any weeks with content
			const allCuecards = await getUserCuecards(courseId); // Get all cuecards for course

			return {
				available: cuecards.length > 0,
				count: cuecards.length,
				hasWeeksWithContent: allCuecards.length > 0,
			};
		},
		"checkCuecardsAvailability",
		{ available: false, count: 0, hasWeeksWithContent: false }
	);
}

// Generation result type
type GenerationResult =
	| { success: true; message: string }
	| { success: false; message: string };

/**
 * Trigger on-demand cuecard generation
 * Integrates with existing generation API
 */
export async function triggerCuecardsGeneration(
	courseId: string,
	weekIds?: string[],
	generationConfig?: SelectiveGenerationConfig
): Promise<GenerationResult> {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, message: "Authentication required" };
		}

		// Get course information for generation
		const course = await db
			.select()
			.from(courses)
			.where(and(eq(courses.id, courseId), eq(courses.userId, user.id)))
			.limit(1);

		if (course.length === 0) {
			return { success: false, message: "Course not found or access denied" };
		}

		// Get weeks if specific weeks requested
		let targetWeeks: string[] = [];
		if (weekIds && weekIds.length > 0 && !weekIds.includes("all-weeks")) {
			const weeks = await db
				.select()
				.from(courseWeeks)
				.where(
					and(
						eq(courseWeeks.courseId, courseId),
						inArray(courseWeeks.id, weekIds)
					)
				);
			targetWeeks = weeks.map((w) => w.id);
		}

		// Call existing generation API
		const response = await fetch("/api/generation/trigger", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				courseId,
				weekIds: targetWeeks.length > 0 ? targetWeeks : undefined,
				features: ["cuecards"], // Only generate cuecards
				priority: "high",
				config: generationConfig, // Pass through the generation config
			}),
		});

		if (!response.ok) {
			return {
				success: false,
				message: "Failed to trigger cuecard generation",
			};
		}

		return {
			success: true,
			message: "Cuecard generation started successfully",
		};
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("Cuecard generation failed:", {
				error: error instanceof Error ? error.message : String(error),
				courseId,
				weekIds,
			});
		}

		return {
			success: false,
			message:
				error instanceof Error
					? error.message
					: "Failed to trigger cuecard generation",
		};
	}
}

/**
 * Get generation status for cuecards
 */
export async function getCuecardsGenerationStatus(_courseId: string): Promise<{
	isGenerating: boolean;
	status: string;
	progress?: number;
}> {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			// This would integrate with your existing generation status tracking
			// For now, return a simple implementation
			return {
				isGenerating: false,
				status: "completed",
				progress: 100,
			};
		},
		"getCuecardsGenerationStatus",
		{ isGenerating: false, status: "unknown", progress: 0 }
	);
}

// Types for session synchronization
export interface CuecardProgress {
	cardId: string;
	status: "not_started" | "in_progress" | "completed";
	score?: number;
	attempts: number;
	lastAttemptAt: Date;
}

export interface SessionSyncData {
	sessionId: string;
	progressData: CuecardProgress[];
	sessionStats?: {
		totalTime: number;
		accuracy: number;
		cardsCompleted: number;
	};
}

/**
 * Update progress for a specific cuecard - simplified version
 * Automatically increments attempts counter
 */
export async function updateCuecardProgress(
	cardId: string,
	progress: Omit<CuecardProgress, "cardId" | "attempts">
): Promise<{ success: boolean; message: string }> {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			// Verify the user owns this cuecard through course ownership
			const cardExists = await db
				.select({ id: cuecards.id })
				.from(cuecards)
				.innerJoin(courses, eq(cuecards.courseId, courses.id))
				.where(and(eq(cuecards.id, cardId), eq(courses.userId, user.id)))
				.limit(1);

			if (cardExists.length === 0) {
				throw new Error("Cuecard not found or access denied");
			}

			// Get current progress to increment attempts
			const existingProgress = await db
				.select({ attempts: userProgress.attempts })
				.from(userProgress)
				.where(
					and(
						eq(userProgress.userId, user.id),
						eq(userProgress.contentType, "cuecard"),
						eq(userProgress.contentId, cardId)
					)
				)
				.limit(1);

			const currentAttempts = existingProgress[0]?.attempts || 0;

			// Upsert user progress with incremented attempts
			await db
				.insert(userProgress)
				.values({
					userId: user.id,
					contentType: "cuecard",
					contentId: cardId,
					status: progress.status,
					score: progress.score,
					attempts: currentAttempts + 1,
					lastAttemptAt: progress.lastAttemptAt,
					updatedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: [
						userProgress.userId,
						userProgress.contentType,
						userProgress.contentId,
					],
					set: {
						status: progress.status,
						score: progress.score,
						attempts: currentAttempts + 1,
						lastAttemptAt: progress.lastAttemptAt,
						updatedAt: new Date(),
					},
				});

			return { success: true, message: "Progress updated successfully" };
		},
		"updateCuecardProgress",
		{ success: false, message: "Failed to update progress" } as {
			success: boolean;
			message: string;
		}
	);
}

/**
 * Get user progress for cuecards
 */
export async function getCuecardProgress(
	courseId: string,
	weekIds?: string[]
): Promise<{ [cardId: string]: CuecardProgress }> {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			// Get cuecards for the course/weeks
			const cardConditions = [
				eq(courses.userId, user.id),
				eq(cuecards.courseId, courseId),
			];

			if (weekIds && weekIds.length > 0 && !weekIds.includes("all-weeks")) {
				cardConditions.push(inArray(cuecards.weekId, weekIds));
			}

			// Get progress data with card information
			const progressData = await db
				.select({
					cardId: cuecards.id,
					status: userProgress.status,
					score: userProgress.score,
					attempts: userProgress.attempts,
					lastAttemptAt: userProgress.lastAttemptAt,
				})
				.from(cuecards)
				.innerJoin(courses, eq(cuecards.courseId, courses.id))
				.leftJoin(
					userProgress,
					and(
						eq(userProgress.contentId, cuecards.id),
						eq(userProgress.userId, user.id),
						eq(userProgress.contentType, "cuecard")
					)
				)
				.where(and(...cardConditions));

			// Convert to map format
			const progressMap: { [cardId: string]: CuecardProgress } = {};

			for (const row of progressData) {
				progressMap[row.cardId] = {
					cardId: row.cardId,
					status:
						(row.status as "not_started" | "in_progress" | "completed") ||
						"not_started",
					score: row.score || undefined,
					attempts: row.attempts || 0,
					lastAttemptAt: row.lastAttemptAt || new Date(0),
				};
			}

			return progressMap;
		},
		"getCuecardProgress",
		{}
	);
}
