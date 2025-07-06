"use server";

import { db } from "@/db";
import { courseWeeks, courses, goldenNotes, summaries } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

// Validation schemas
const UpdateGoldenNoteSchema = z.object({
	id: z.string().uuid(),
	title: z.string().min(1).max(255).optional(),
	content: z.string().min(1).optional(),
	category: z.string().max(100).optional(),
	priority: z.number().min(1).max(5).optional(),
});

export type UpdateGoldenNoteInput = z.infer<typeof UpdateGoldenNoteSchema>;

/**
 * Get golden notes for a specific course and week
 */
export async function getGoldenNotes(courseId: string, weekId?: string) {
	return await withErrorHandling(
		async () => {
			const conditions = [eq(goldenNotes.courseId, courseId)];

			if (weekId) {
				conditions.push(eq(goldenNotes.weekId, weekId));
			}

			const notes = await db
				.select({
					id: goldenNotes.id,
					title: goldenNotes.title,
					content: goldenNotes.content,
					priority: goldenNotes.priority,
					category: goldenNotes.category,
					createdAt: goldenNotes.createdAt,
					updatedAt: goldenNotes.updatedAt,
					weekId: goldenNotes.weekId,
					courseId: goldenNotes.courseId,
				})
				.from(goldenNotes)
				.where(conditions.length > 1 ? and(...conditions) : conditions[0])
				.orderBy(desc(goldenNotes.priority), asc(goldenNotes.createdAt));

			return notes;
		},
		"getGoldenNotes",
		[]
	);
}

/**
 * Get summaries for a specific course and week
 */
export async function getSummaries(courseId: string, weekId?: string) {
	return await withErrorHandling(
		async () => {
			const conditions = [eq(summaries.courseId, courseId)];

			if (weekId) {
				conditions.push(eq(summaries.weekId, weekId));
			}

			const summaryData = await db
				.select({
					id: summaries.id,
					title: summaries.title,
					content: summaries.content,
					summaryType: summaries.summaryType,
					wordCount: summaries.wordCount,
					createdAt: summaries.createdAt,
					updatedAt: summaries.updatedAt,
					weekId: summaries.weekId,
					courseId: summaries.courseId,
				})
				.from(summaries)
				.where(conditions.length > 1 ? and(...conditions) : conditions[0])
				.orderBy(desc(summaries.createdAt));

			return summaryData;
		},
		"getSummaries",
		[]
	);
}

/**
 * Get course weeks with their materials for notes page
 */
export async function getCourseWeeksWithMaterials(courseId: string) {
	return await withErrorHandling(
		async () => {
			const weeks = await db.query.courseWeeks.findMany({
				where: eq(courseWeeks.courseId, courseId),
				with: {
					courseMaterials: {
						columns: {
							id: true,
							title: true,
							fileName: true,
							createdAt: true,
						},
					},
				},
				orderBy: asc(courseWeeks.weekNumber),
			});

			return weeks.map((week) => ({
				...week,
				hasContent: week.courseMaterials.length > 0,
				materialTitle: week.courseMaterials[0]?.title || null,
			}));
		},
		"getCourseWeeksWithMaterials",
		[]
	);
}

/**
 * Update a golden note
 */
export async function updateGoldenNote(input: UpdateGoldenNoteInput) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		const validatedInput = UpdateGoldenNoteSchema.parse(input);
		const { id, ...updateData } = validatedInput;

		// Verify the note belongs to the user's course
		const existingNote = await db.query.goldenNotes.findFirst({
			where: eq(goldenNotes.id, id),
			with: {
				course: {
					columns: {
						userId: true,
					},
				},
			},
		});

		if (!existingNote) {
			throw new Error("Note not found");
		}

		if (existingNote.course.userId !== user.id) {
			throw new Error("Access denied");
		}

		const updatedNote = await db
			.update(goldenNotes)
			.set({
				...updateData,
				updatedAt: new Date(),
			})
			.where(eq(goldenNotes.id, id))
			.returning();

		return { success: true, data: updatedNote[0] };
	} catch (error) {
		console.error("Failed to update golden note:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Delete a golden note
 */
export async function deleteGoldenNote(noteId: string) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		// Verify the note belongs to the user's course
		const existingNote = await db.query.goldenNotes.findFirst({
			where: eq(goldenNotes.id, noteId),
			with: {
				course: {
					columns: {
						userId: true,
					},
				},
			},
		});

		if (!existingNote) {
			throw new Error("Note not found");
		}

		if (existingNote.course.userId !== user.id) {
			throw new Error("Access denied");
		}

		await db.delete(goldenNotes).where(eq(goldenNotes.id, noteId));

		return { success: true };
	} catch (error) {
		console.error("Failed to delete golden note:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get notes data for a specific course and week
 */
export async function getNotesData(courseId: string, weekId?: string) {
	return await withErrorHandling(
		async () => {
			const [goldenNotesData, summariesData, weekData] = await Promise.all([
				getGoldenNotes(courseId, weekId),
				getSummaries(courseId, weekId),
				getCourseWeeksWithMaterials(courseId),
			]);

			return {
				goldenNotes: goldenNotesData,
				summaries: summariesData,
				weeks: weekData,
			};
		},
		"getNotesData",
		{
			goldenNotes: [],
			summaries: [],
			weeks: [],
		}
	);
}

/**
 * Get user's courses for course selection
 */
export async function getUserCoursesForNotes() {
	return await withErrorHandling(
		async () => {
			const userCourses = await db.query.courses.findMany({
				columns: {
					id: true,
					name: true,
					description: true,
					createdAt: true,
				},
				orderBy: desc(courses.createdAt),
			});

			return userCourses;
		},
		"getUserCoursesForNotes",
		[]
	);
}
