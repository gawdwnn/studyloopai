"use server";

import { db } from "@/db";
import { ownNotes } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

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
	noteType: z.enum(["general", "annotation", "summary", "question"]).default("general"),
	tags: z.array(z.string()).default([]),
	isPrivate: z.boolean().default(true),
	color: z.string().default("#ffffff"),
});

const UpdateOwnNoteSchema = CreateOwnNoteSchema.partial().extend({
	id: z.string().uuid(),
	version: z.number().int().min(1),
});

export type CreateOwnNoteInput = z.infer<typeof CreateOwnNoteSchema>;
export type UpdateOwnNoteInput = z.infer<typeof UpdateOwnNoteSchema>;

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
 * Update an existing user note with optimistic locking
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
			const { id, version, ...updateData } = validatedInput;

			// Check current version before updating
			const currentNote = await db
				.select({ version: ownNotes.version })
				.from(ownNotes)
				.where(eq(ownNotes.id, id))
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
				.update(ownNotes)
				.set({
					...updateData,
					version: version + 1,
					updatedAt: new Date(),
				})
				.where(and(eq(ownNotes.id, id), eq(ownNotes.version, version)))
				.returning();

			if (updatedNote.length === 0) {
				throw new Error("Update failed due to concurrent modification");
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
 * Get user notes with filtering options
 */
export async function getOwnNotes(options: {
	weekId: string;
	courseId: string;
	noteType?: string;
	searchQuery?: string;
	tags?: string[];
}) {
	return await withErrorHandling(
		async () => {
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

			const notes = await db
				.select()
				.from(ownNotes)
				.where(conditions.length > 1 ? and(...conditions) : conditions[0])
				.orderBy(desc(ownNotes.updatedAt));

			// Filter by tags if provided (done in JS since JSONB queries are complex)
			let filteredNotes = notes;
			if (options.tags && options.tags.length > 0) {
				const searchTags = options.tags; // Type narrowing
				filteredNotes = notes.filter((note) => {
					const noteTags = (note.tags as string[]) || [];
					return searchTags.some((tag) => noteTags.includes(tag));
				});
			}

			return filteredNotes;
		},
		"getOwnNotes",
		[]
	);
}

/**
 * Get note by ID
 */
export async function getOwnNoteById(noteId: string) {
	return await withErrorHandling(
		async () => {
			const note = await db.select().from(ownNotes).where(eq(ownNotes.id, noteId)).limit(1);

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
