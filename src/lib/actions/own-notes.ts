"use server";

import { db } from "@/db";
import { ownNotes } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

// Import the NoteType from the hook to keep consistency
import type { NoteType } from "@/hooks/use-own-notes";

// Validation schemas
const CreateOwnNoteSchema = z.object({
	weekId: z.string().uuid(),
	courseId: z.string().uuid(),
	title: z.string().min(1).max(255),
	content: z
		.string()
		.trim()
		.min(1, "Content is required")
		.max(50000, "Content cannot exceed 50,000 characters"),
	noteType: z
		.enum(["general", "annotation", "summary", "question"])
		.default("general"),
	tags: z.array(z.string()).default([]),
	isPrivate: z.boolean().default(true),
	color: z.string().default("#ffffff"),
});

const UpdateOwnNoteSchema = CreateOwnNoteSchema.partial().extend({
	id: z.string().uuid(),
});

export type CreateOwnNoteInput = z.infer<typeof CreateOwnNoteSchema>;
export type UpdateOwnNoteInput = z.infer<typeof UpdateOwnNoteSchema>;

/**
 * Create a new user note
 */
export async function createOwnNote(input: CreateOwnNoteInput) {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			const validatedInput = CreateOwnNoteSchema.parse(input);

			const newNote = await db
				.insert(ownNotes)
				.values({
					userId: user.id,
					...validatedInput,
					metadata: {},
				})
				.returning();

			return newNote[0];
		},
		"createOwnNote",
		null
	);
}

/**
 * Update an existing user note
 */
export async function updateOwnNote(input: UpdateOwnNoteInput) {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			const validatedInput = UpdateOwnNoteSchema.parse(input);
			const { id, ...updateData } = validatedInput;

			const updatedNote = await db
				.update(ownNotes)
				.set({
					...updateData,
					updatedAt: new Date(),
				})
				.where(eq(ownNotes.id, id))
				.returning();

			if (updatedNote.length === 0) {
				throw new Error("Note not found or access denied");
			}

			return updatedNote[0];
		},
		"updateOwnNote",
		null
	);
}

/**
 * Delete a user note
 */
export async function deleteOwnNote(noteId: string) {
	return await withErrorHandling(
		async () => {
			// RLS policies ensure user can only delete their own notes
			await db.delete(ownNotes).where(eq(ownNotes.id, noteId));
			return true;
		},
		"deleteOwnNote",
		false
	);
}

/**
 * Get user notes with filtering and pagination options
 */
export async function getOwnNotes(options: {
	weekId: string;
	courseId: string;
	noteType?: NoteType;
	searchQuery?: string;
	tags?: string[];
	page?: number;
	limit?: number;
}) {
	return await withErrorHandling(
		async () => {
			const page = options.page || 1;
			const limit = options.limit || 20;
			const offset = (page - 1) * limit;

			const conditions = [
				eq(ownNotes.courseId, options.courseId),
				eq(ownNotes.weekId, options.weekId),
			];

			if (options.noteType) {
				conditions.push(eq(ownNotes.noteType, options.noteType));
			}

			if (options.searchQuery) {
				const searchTerm = `%${options.searchQuery}%`;
				const searchCondition = sql`${ownNotes.title} ILIKE ${searchTerm} OR ${ownNotes.content} ILIKE ${searchTerm}`;
				conditions.push(searchCondition);
			}

			// Use PostgreSQL JSONB operators for tag filtering instead of JS
			if (options.tags && options.tags.length > 0) {
				// Check if any of the provided tags exist in the note's tags array
				const tagConditions = options.tags.map(
					(tag) => sql`${ownNotes.tags} @> ${JSON.stringify([tag])}`
				);
				// OR condition for any tag match
				const tagCondition = sql`(${sql.join(tagConditions, sql` OR `)})`;
				conditions.push(tagCondition);
			}

			// Get total count for pagination
			const [countResult] = await db
				.select({ count: sql<number>`cast(count(*) as int)` })
				.from(ownNotes)
				.where(conditions.length > 1 ? and(...conditions) : conditions[0]);

			const totalCount = countResult?.count || 0;
			const totalPages = Math.ceil(totalCount / limit);

			// Get paginated notes
			const notes = await db
				.select()
				.from(ownNotes)
				.where(conditions.length > 1 ? and(...conditions) : conditions[0])
				.orderBy(desc(ownNotes.updatedAt))
				.limit(limit)
				.offset(offset);

			return {
				notes,
				pagination: {
					page,
					limit,
					totalCount,
					totalPages,
					hasNext: page < totalPages,
					hasPrev: page > 1,
				},
			};
		},
		"getOwnNotes",
		{
			notes: [],
			pagination: {
				page: 1,
				limit: 20,
				totalCount: 0,
				totalPages: 0,
				hasNext: false,
				hasPrev: false,
			},
		}
	);
}

/**
 * Get note by ID
 */
export async function getOwnNoteById(noteId: string) {
	return await withErrorHandling(
		async () => {
			const note = await db
				.select()
				.from(ownNotes)
				.where(eq(ownNotes.id, noteId))
				.limit(1);

			if (note.length === 0) {
				throw new Error("Note not found or access denied");
			}

			return note[0];
		},
		"getOwnNoteById",
		null
	);
}

/**
 * Get all unique tags used by the user
 */
export async function getUserNoteTags() {
	return await withErrorHandling(
		async () => {
			const notes = await db.select({ tags: ownNotes.tags }).from(ownNotes);

			// Extract unique tags
			const allTags = new Set<string>();
			for (const note of notes) {
				const tags = (note.tags as string[]) || [];
				for (const tag of tags) {
					allTags.add(tag);
				}
			}

			return Array.from(allTags).sort();
		},
		"getUserNoteTags",
		[]
	);
}
