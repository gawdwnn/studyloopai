"use server";

import { db } from "@/db";
import { courseWeeks, courses, multipleChoiceQuestions } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import type { MCQ } from "@/types/database-types";
import { and, eq, inArray } from "drizzle-orm";

export type UserMCQ = MCQ & {
	weekNumber: number;
};

export type MCQAvailability = {
	available: boolean;
	count: number;
	hasCourseWeeksWithContent: boolean;
	availableWeeks: Array<{ id: string; weekNumber: number }>;
	mcqsByWeek: Record<string, number>;
	difficultyBreakdown: Record<string, number>;
};

/**
 * OPTIMIZED: Single query to get MCQs with availability info
 * Eliminates the double-query pattern from the hook
 */
export async function getUserMCQsWithAvailability(
	courseId: string,
	weekIds?: string[]
): Promise<{
	mcqs: UserMCQ[];
	availability: MCQAvailability;
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

			// SINGLE QUERY: Get MCQs + week info + materials check using LEFT JOIN
			const result = await db
				.select({
					// MCQ data (null if no MCQs exist)
					id: multipleChoiceQuestions.id,
					courseId: multipleChoiceQuestions.courseId,
					weekId: multipleChoiceQuestions.weekId,
					question: multipleChoiceQuestions.question,
					options: multipleChoiceQuestions.options,
					correctAnswer: multipleChoiceQuestions.correctAnswer,
					explanation: multipleChoiceQuestions.explanation,
					difficulty: multipleChoiceQuestions.difficulty,
					metadata: multipleChoiceQuestions.metadata,
					createdAt: multipleChoiceQuestions.createdAt,
					updatedAt: multipleChoiceQuestions.updatedAt,
					// Week data (always present)
					actualWeekId: courseWeeks.id,
					weekNumber: courseWeeks.weekNumber,
					weekHasMaterials: courseWeeks.hasMaterials,
				})
				.from(courseWeeks)
				.leftJoin(
					multipleChoiceQuestions,
					eq(courseWeeks.id, multipleChoiceQuestions.weekId)
				)
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
			const mcqs = result
				.filter(
					(
						r
					): r is typeof r & {
						id: NonNullable<typeof r.id>;
						courseId: NonNullable<typeof r.courseId>;
						weekId: NonNullable<typeof r.weekId>;
						question: NonNullable<typeof r.question>;
						options: NonNullable<typeof r.options>;
						correctAnswer: NonNullable<typeof r.correctAnswer>;
						explanation: NonNullable<typeof r.explanation>;
						difficulty: NonNullable<typeof r.difficulty>;
						metadata: NonNullable<typeof r.metadata>;
						createdAt: NonNullable<typeof r.createdAt>;
						updatedAt: NonNullable<typeof r.updatedAt>;
					} => r.id !== null
				) // Only actual MCQs
				.map((r) => ({
					id: r.id,
					courseId: r.courseId,
					weekId: r.weekId,
					question: r.question,
					options: r.options,
					correctAnswer: r.correctAnswer,
					explanation: r.explanation,
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
					mcqs.map((mcq) => [
						mcq.weekId,
						{ id: mcq.weekId, weekNumber: mcq.weekNumber },
					])
				).values()
			);

			const mcqsByWeek = mcqs.reduce(
				(acc, mcq) => {
					acc[mcq.weekId] = (acc[mcq.weekId] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

			// Calculate difficulty breakdown
			const difficultyBreakdown = mcqs.reduce(
				(acc, mcq) => {
					const difficulty =
						(typeof mcq.difficulty === "string"
							? mcq.difficulty.toLowerCase()
							: null) || "medium";
					acc[difficulty] = (acc[difficulty] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

			const availability: MCQAvailability = {
				available: mcqs.length > 0,
				count: mcqs.length,
				hasCourseWeeksWithContent: weeksWithMaterials,
				availableWeeks,
				mcqsByWeek,
				difficultyBreakdown,
			};

			return { mcqs, availability };
		},
		"getUserMCQsWithAvailability",
		{
			mcqs: [] as UserMCQ[],
			availability: {
				available: false,
				count: 0,
				hasCourseWeeksWithContent: false,
				availableWeeks: [],
				mcqsByWeek: {},
				difficultyBreakdown: {},
			} as MCQAvailability,
		}
	);
}
