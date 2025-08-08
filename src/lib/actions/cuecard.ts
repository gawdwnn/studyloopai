"use server";

import { db } from "@/db";
import { courseWeeks, courses, cuecards } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { and, eq, inArray } from "drizzle-orm";

import type { Cuecard } from "@/types/database-types";

export type UserCuecard = Cuecard & {
	weekNumber: number;
};

export type CuecardAvailability = {
	available: boolean;
	count: number;
	hasCourseWeeksWithContent: boolean;
	availableWeeks: Array<{ id: string; weekNumber: number }>;
	cuecardsByWeek: Record<string, number>;
};

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

			const shouldFilterByWeeks =
				weekIds?.length && !weekIds.includes("all-weeks");

			// SINGLE QUERY: Get cuecards + week info + materials check using RIGHT JOIN
			const result = await db
				.select({
					// Cuecard data (null if no cuecards exist)
					id: cuecards.id,
					courseId: cuecards.courseId,
					weekId: cuecards.weekId,
					question: cuecards.question,
					answer: cuecards.answer,
					difficulty: cuecards.difficulty,
					metadata: cuecards.metadata,
					createdAt: cuecards.createdAt,
					updatedAt: cuecards.updatedAt,
					// Week data (always present)
					actualWeekId: courseWeeks.id,
					weekNumber: courseWeeks.weekNumber,
					weekHasMaterials: courseWeeks.hasMaterials,
				})
				.from(courseWeeks)
				.leftJoin(cuecards, eq(courseWeeks.id, cuecards.weekId))
				.innerJoin(courses, eq(courseWeeks.courseId, courses.id))
				.where(
					and(
						eq(courses.userId, user.id),
						eq(courseWeeks.courseId, courseId),
						eq(courseWeeks.hasMaterials, true),
						shouldFilterByWeeks ? inArray(courseWeeks.id, weekIds) : undefined
					)
				);

			// Process results
			const cards = result
				.filter(
					(
						r
					): r is typeof r & {
						id: NonNullable<typeof r.id>;
						courseId: NonNullable<typeof r.courseId>;
						weekId: NonNullable<typeof r.weekId>;
						question: NonNullable<typeof r.question>;
						answer: NonNullable<typeof r.answer>;
						difficulty: NonNullable<typeof r.difficulty>;
						metadata: NonNullable<typeof r.metadata>;
						createdAt: NonNullable<typeof r.createdAt>;
						updatedAt: NonNullable<typeof r.updatedAt>;
					} => r.id !== null
				) // Only actual cuecards
				.map((r) => ({
					id: r.id,
					courseId: r.courseId,
					weekId: r.weekId,
					question: r.question,
					answer: r.answer,
					difficulty: r.difficulty,
					metadata: r.metadata,
					createdAt: r.createdAt,
					updatedAt: r.updatedAt,
					weekNumber: r.weekNumber,
				}));

			const weeksWithMaterials = result.length > 0; // Any week with materials exists

			// Calculate availability
			const availableWeeks = Array.from(
				new Map(
					cards.map((card) => [
						card.weekId,
						{ id: card.weekId, weekNumber: card.weekNumber },
					])
				).values()
			);

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
				hasCourseWeeksWithContent: weeksWithMaterials,
				availableWeeks,
				cuecardsByWeek,
			};

			return { cards, availability };
		},
		"getUserCuecardsWithAvailability",
		{
			cards: [] as UserCuecard[],
			availability: {
				available: false,
				count: 0,
				hasCourseWeeksWithContent: false,
				availableWeeks: [],
				cuecardsByWeek: {},
			} as CuecardAvailability,
		}
	);
}
