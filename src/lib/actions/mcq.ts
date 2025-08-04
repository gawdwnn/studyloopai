"use server";

import { db } from "@/db";
import { courseWeeks, courses, multipleChoiceQuestions } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { and, eq, inArray } from "drizzle-orm";

// Define MCQ type based on the database schema
export type UserMCQ = {
	id: string;
	courseId: string;
	weekId: string;
	question: string;
	options: string[];
	correctAnswer: string;
	explanation: string | null;
	difficulty: string | null;
	metadata: unknown;
	createdAt: Date | null;
	updatedAt: Date | null;
	weekNumber: number;
};

// Extended availability type with optimization data
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

			// Single optimized query to get both MCQs and availability info
			const shouldFilterByWeeks =
				weekIds?.length && !weekIds.includes("all-weeks");

			// Get MCQs with week information in one query
			const baseQuery = db
				.select({
					// MCQ fields
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
					// Week fields
					weekNumber: courseWeeks.weekNumber,
				})
				.from(multipleChoiceQuestions)
				.innerJoin(
					courseWeeks,
					eq(multipleChoiceQuestions.weekId, courseWeeks.id)
				)
				.innerJoin(courses, eq(multipleChoiceQuestions.courseId, courses.id))
				.where(
					and(
						eq(courses.userId, user.id), // RLS protection
						eq(multipleChoiceQuestions.courseId, courseId),
						// Only include weeks that have materials (required for generation)
						eq(courseWeeks.hasMaterials, true),
						shouldFilterByWeeks
							? inArray(multipleChoiceQuestions.weekId, weekIds)
							: undefined
					)
				);

			const mcqs = await baseQuery;

			// Calculate availability from the results
			const uniqueWeeks = new Map<string, { id: string; weekNumber: number }>();
			for (const mcq of mcqs) {
				uniqueWeeks.set(mcq.weekId, {
					id: mcq.weekId,
					weekNumber: mcq.weekNumber,
				});
			}
			const availableWeeks = Array.from(uniqueWeeks.values());

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
				hasCourseWeeksWithContent: availableWeeks.length > 0,
				availableWeeks,
				mcqsByWeek,
				difficultyBreakdown,
			};

			return {
				mcqs,
				availability,
			};
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
