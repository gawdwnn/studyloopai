"use server";

import { db } from "@/db";
import { courseWeeks, goldenNotes, summaries } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { asc, desc, eq } from "drizzle-orm";
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

type NoteOperationResult<T = unknown> =
	| { success: true; data: T }
	| { success: false; data: null };

/**
 * Get ALL golden notes for a course (all weeks)
 */
export async function getAllGoldenNotes(courseId: string) {
	return await withErrorHandling(
		async () => {
			const notes = await db
				.select({
					id: goldenNotes.id,
					title: goldenNotes.title,
					content: goldenNotes.content,
					priority: goldenNotes.priority,
					category: goldenNotes.category,
					version: goldenNotes.version,
					createdAt: goldenNotes.createdAt,
					updatedAt: goldenNotes.updatedAt,
					weekId: goldenNotes.weekId,
					courseId: goldenNotes.courseId,
				})
				.from(goldenNotes)
				.where(eq(goldenNotes.courseId, courseId))
				.orderBy(desc(goldenNotes.priority), asc(goldenNotes.createdAt));

			return notes;
		},
		"getAllGoldenNotes",
		[]
	);
}

/**
 * Get ALL summaries for a course (all weeks)
 */
export async function getAllSummaries(courseId: string) {
	return await withErrorHandling(
		async () => {
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
				.where(eq(summaries.courseId, courseId))
				.orderBy(desc(summaries.createdAt));

			return summaryData;
		},
		"getAllSummaries",
		[]
	);
}

/**
 * Get ALL notes data for a course (unified query)
 */
export async function getAllCourseNotesData(courseId: string) {
	return await withErrorHandling(
		async () => {
			const [goldenNotesData, summariesData, weekData] = await Promise.all([
				getAllGoldenNotes(courseId),
				getAllSummaries(courseId),
				getCourseWeeks(courseId),
			]);

			return {
				goldenNotes: goldenNotesData,
				summaries: summariesData,
				weeks: weekData,
				ownNotes: [], // Own notes are handled separately in UserNotesEditor
			};
		},
		"getAllCourseNotesData",
		{
			goldenNotes: [],
			summaries: [],
			weeks: [],
			ownNotes: [],
		}
	);
}

/**
 * Get course weeks with their materials for notes page
 */
export async function getCourseWeeks(courseId: string) {
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
		"getCourseWeeks",
		[]
	);
}

/**
 * Update a golden note
 */
export async function updateGoldenNote(
	input: UpdateGoldenNoteInput
): Promise<NoteOperationResult> {
	return await withErrorHandling(
		async (): Promise<NoteOperationResult> => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			const validatedInput = UpdateGoldenNoteSchema.parse(input);
			const { id, ...updateData } = validatedInput;

			const updatedNote = await db
				.update(goldenNotes)
				.set({
					...updateData,
					updatedAt: new Date(),
				})
				.where(eq(goldenNotes.id, id))
				.returning();

			if (updatedNote.length === 0) {
				throw new Error("Note not found or access denied");
			}

			return { success: true, data: updatedNote[0] };
		},
		"updateGoldenNote",
		{ success: false, data: null }
	);
}

/**
 * Delete a golden note
 */
export async function deleteGoldenNote(
	noteId: string
): Promise<NoteOperationResult<{ id: string }>> {
	return await withErrorHandling(
		async (): Promise<NoteOperationResult<{ id: string }>> => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			const result = await db
				.delete(goldenNotes)
				.where(eq(goldenNotes.id, noteId))
				.returning({ id: goldenNotes.id });

			if (result.length === 0) {
				throw new Error("Note not found or access denied");
			}

			return { success: true, data: result[0] };
		},
		"deleteGoldenNote",
		{ success: false, data: null }
	);
}
