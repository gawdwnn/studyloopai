"use server";

import { db } from "@/db";
import { courseWeeks, courses, cuecards, userProgress } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { and, eq, inArray } from "drizzle-orm";

// Import types from centralized database types
import type { Cuecard } from "@/types/database-types";

// Types for cuecards data - extended with week information
export type UserCuecard = Cuecard & {
	weekNumber: number;
};

// Extended availability type with optimization data
export type CuecardAvailability = {
	available: boolean;
	count: number;
	hasWeeksWithContent: boolean;
	availableWeeks: Array<{ id: string; weekNumber: number }>;
	cuecardsByWeek: Record<string, number>;
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

// TODO: fix this code!
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

/**
 * OPTIMIZED: Check cuecards availability with hasMaterials pre-filtering
 * This eliminates the double-query issue in the original function
 */
export async function checkCuecardsAvailabilityOptimized(
	courseId: string,
	weekIds?: string[]
): Promise<CuecardAvailability> {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			// PRE-FILTER: Only query weeks that have materials
			const weeksWithMaterialsQuery = db
				.select({
					id: courseWeeks.id,
					weekNumber: courseWeeks.weekNumber,
				})
				.from(courseWeeks)
				.innerJoin(courses, eq(courseWeeks.courseId, courses.id))
				.where(
					and(
						eq(courses.userId, user.id),
						eq(courseWeeks.courseId, courseId),
						eq(courseWeeks.hasMaterials, true), // 🎯 KEY OPTIMIZATION
						weekIds?.length && !weekIds.includes("all-weeks")
							? inArray(courseWeeks.id, weekIds)
							: undefined
					)
				);

			const weeksWithMaterials = await weeksWithMaterialsQuery;

			if (weeksWithMaterials.length === 0) {
				return {
					available: false,
					count: 0,
					hasWeeksWithContent: false,
					availableWeeks: [],
					cuecardsByWeek: {},
				};
			}

			// Query cuecards only for weeks with materials
			const cuecardsQuery = db
				.select({
					id: cuecards.id,
					weekId: cuecards.weekId,
					weekNumber: courseWeeks.weekNumber,
				})
				.from(cuecards)
				.innerJoin(courseWeeks, eq(cuecards.weekId, courseWeeks.id))
				.innerJoin(courses, eq(cuecards.courseId, courses.id))
				.where(
					and(
						eq(courses.userId, user.id),
						eq(cuecards.courseId, courseId),
						inArray(
							cuecards.weekId,
							weeksWithMaterials.map((w) => w.id)
						)
					)
				);

			const cuecardsResult = await cuecardsQuery;

			// Build cuecards-by-week map
			const cuecardsByWeek = cuecardsResult.reduce(
				(acc, card) => {
					acc[card.weekId] = (acc[card.weekId] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

			return {
				available: cuecardsResult.length > 0,
				count: cuecardsResult.length,
				hasWeeksWithContent: true, // We know this is true from pre-filter
				availableWeeks: weeksWithMaterials,
				cuecardsByWeek,
			};
		},
		"checkCuecardsAvailabilityOptimized",
		{
			available: false,
			count: 0,
			hasWeeksWithContent: false,
			availableWeeks: [],
			cuecardsByWeek: {},
		}
	);
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
