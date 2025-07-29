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
 * OPTIMIZED: Single query to get cuecards with availability info
 * Eliminates the double-query pattern from the hook
 */
export async function getUserCuecardsWithAvailability(
	courseId: string,
	weekIds?: string[]
): Promise<{
	cards: UserCuecard[];
	availability: CuecardAvailability;
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

			// Single optimized query to get both cards and availability info
			const shouldFilterByWeeks =
				weekIds?.length && !weekIds.includes("all-weeks");

			// Get cuecards with week information in one query
			const baseQuery = db
				.select({
					// Cuecard fields
					id: cuecards.id,
					courseId: cuecards.courseId,
					weekId: cuecards.weekId,
					question: cuecards.question,
					answer: cuecards.answer,
					difficulty: cuecards.difficulty,
					metadata: cuecards.metadata,
					createdAt: cuecards.createdAt,
					updatedAt: cuecards.updatedAt,
					// Week fields
					weekNumber: courseWeeks.weekNumber,
				})
				.from(cuecards)
				.innerJoin(courseWeeks, eq(cuecards.weekId, courseWeeks.id))
				.innerJoin(courses, eq(cuecards.courseId, courses.id))
				.where(
					and(
						eq(courses.userId, user.id), // RLS protection
						eq(cuecards.courseId, courseId),
						// Only include weeks that have materials (required for generation)
						eq(courseWeeks.hasMaterials, true),
						shouldFilterByWeeks ? inArray(cuecards.weekId, weekIds) : undefined
					)
				);

			const cards = await baseQuery;

			// Calculate availability from the results
			const uniqueWeeks = new Map<string, { id: string; weekNumber: number }>();
			for (const card of cards) {
				uniqueWeeks.set(card.weekId, {
					id: card.weekId,
					weekNumber: card.weekNumber,
				});
			}
			const availableWeeks = Array.from(uniqueWeeks.values());

			const cuecardsByWeek = cards.reduce(
				(acc, card) => {
					acc[card.weekId] = (acc[card.weekId] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

			const availability: CuecardAvailability = {
				available: cards.length > 0,
				count: cards.length,
				hasWeeksWithContent: availableWeeks.length > 0,
				availableWeeks,
				cuecardsByWeek,
			};

			return {
				cards,
				availability,
			};
		},
		"getUserCuecardsWithAvailability",
		{
			cards: [] as UserCuecard[],
			availability: {
				available: false,
				count: 0,
				hasWeeksWithContent: false,
				availableWeeks: [],
				cuecardsByWeek: {},
			} as CuecardAvailability,
		}
	);
}
