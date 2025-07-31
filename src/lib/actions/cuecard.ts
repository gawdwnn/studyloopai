"use server";

import { db } from "@/db";
import { courseWeeks, courses, cuecards } from "@/db/schema";
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

// Progress is now tracked via adaptive learning tables (session_responses, learning_sessions)
// No need for real-time progress updates during sessions

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
