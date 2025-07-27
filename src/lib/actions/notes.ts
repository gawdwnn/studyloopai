"use server";

import { db } from "@/db";
import { courseWeeks, goldenNotes, summaries } from "@/db/schema";
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
	version: z.number().int().min(1),
});

export type UpdateGoldenNoteInput = z.infer<typeof UpdateGoldenNoteSchema>;

type NoteOperationResult<T = unknown> =
	| { success: true; data: T }
	| { success: false; data: null };

// Conflict resolution types
export type ConflictResolutionStrategy = "client" | "server" | "merge";

export type ConflictError = {
	type: "version_conflict";
	message: string;
	serverVersion: number;
	clientVersion: number;
	serverData?: unknown;
};

/**
 * Get notes data for a specific course and week
 */
export async function getNotesData(courseId: string, weekId: string) {
	return await withErrorHandling(
		async () => {
			const [goldenNotesData, summariesData, weekData] = await Promise.all([
				getGoldenNotes(courseId, weekId),
				getSummaries(courseId, weekId),
				getCourseWeeks(courseId),
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
 * Get golden notes for a specific course and week
 */
export async function getGoldenNotes(courseId: string, weekId: string) {
	return await withErrorHandling(
		async () => {
			if (!weekId || weekId.trim() === "") {
				return [];
			}

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
				.where(
					and(
						eq(goldenNotes.courseId, courseId),
						eq(goldenNotes.weekId, weekId)
					)
				)
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
export async function getSummaries(courseId: string, weekId: string) {
	return await withErrorHandling(
		async () => {
			if (!weekId || weekId.trim() === "") {
				return [];
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
				.where(
					and(eq(summaries.courseId, courseId), eq(summaries.weekId, weekId))
				)
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
 * Update a golden note with optimistic locking
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
			const { id, version, ...updateData } = validatedInput;

			// Check current version before updating
			const currentNote = await db
				.select({ version: goldenNotes.version })
				.from(goldenNotes)
				.where(eq(goldenNotes.id, id))
				.limit(1);

			if (currentNote.length === 0) {
				throw new Error("Note not found or access denied");
			}

			if (currentNote[0].version !== version) {
				// Version conflict detected
				const conflictError: ConflictError = {
					type: "version_conflict",
					message: `Version conflict: Expected version ${version}, but current version is ${currentNote[0].version}`,
					serverVersion: currentNote[0].version,
					clientVersion: version,
				};
				throw new Error(JSON.stringify(conflictError));
			}

			// Optimistic update with version increment
			const updatedNote = await db
				.update(goldenNotes)
				.set({
					...updateData,
					version: version + 1,
					updatedAt: new Date(),
				})
				.where(and(eq(goldenNotes.id, id), eq(goldenNotes.version, version)))
				.returning();

			if (updatedNote.length === 0) {
				throw new Error("Update failed due to concurrent modification");
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
