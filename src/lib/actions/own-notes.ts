"use server";

import { db } from "@/db";
import { ownNotes } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

// Validation schemas
const CreateOwnNoteSchema = z.object({
	materialId: z.string().uuid().optional(),
	courseId: z.string().uuid().optional(),
	title: z.string().min(1).max(255),
	content: z.string().min(1),
	noteType: z.enum(["general", "annotation", "summary", "question"]).default("general"),
	tags: z.array(z.string()).default([]),
	isPrivate: z.boolean().default(true),
	color: z.string().default("#ffffff"),
	position: z.object({}).optional(),
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
	try {
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

		return { success: true, data: newNote[0] };
	} catch (error) {
		console.error("Failed to create own note:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Update an existing user note
 */
export async function updateOwnNote(input: UpdateOwnNoteInput) {
	try {
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
			.where(and(eq(ownNotes.id, id), eq(ownNotes.userId, user.id)))
			.returning();

		if (updatedNote.length === 0) {
			throw new Error("Note not found or access denied");
		}

		return { success: true, data: updatedNote[0] };
	} catch (error) {
		console.error("Failed to update own note:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Delete a user note
 */
export async function deleteOwnNote(noteId: string) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		await db.delete(ownNotes).where(and(eq(ownNotes.id, noteId), eq(ownNotes.userId, user.id)));

		return { success: true };
	} catch (error) {
		console.error("Failed to delete own note:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get user notes with filtering options
 */
export async function getOwnNotes(options?: {
	materialId?: string;
	courseId?: string;
	noteType?: string;
	searchQuery?: string;
	tags?: string[];
}) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		// Apply filters
		const conditions = [eq(ownNotes.userId, user.id)];

		if (options?.materialId) {
			conditions.push(eq(ownNotes.materialId, options.materialId));
		}

		if (options?.courseId) {
			conditions.push(eq(ownNotes.courseId, options.courseId));
		}

		if (options?.noteType) {
			conditions.push(eq(ownNotes.noteType, options.noteType));
		}

		if (options?.searchQuery) {
			const searchTerm = `%${options.searchQuery}%`;
			// use a raw SQL condition combining both title and content ILIKE checks
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
		if (options?.tags && options.tags.length > 0) {
			filteredNotes = notes.filter((note) => {
				const noteTags = (note.tags as string[]) || [];
				return options.tags?.some((tag) => noteTags.includes(tag)) ?? false;
			});
		}

		return { success: true, data: filteredNotes };
	} catch (error) {
		console.error("Failed to fetch own notes:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get note by ID
 */
export async function getOwnNoteById(noteId: string) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		const note = await db
			.select()
			.from(ownNotes)
			.where(and(eq(ownNotes.id, noteId), eq(ownNotes.userId, user.id)))
			.limit(1);

		if (note.length === 0) {
			throw new Error("Note not found or access denied");
		}

		return { success: true, data: note[0] };
	} catch (error) {
		console.error("Failed to fetch own note:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get all unique tags used by the user
 */
export async function getUserNoteTags() {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		const notes = await db
			.select({ tags: ownNotes.tags })
			.from(ownNotes)
			.where(eq(ownNotes.userId, user.id));

		// Extract unique tags
		const allTags = new Set<string>();
		for (const note of notes) {
			const tags = (note.tags as string[]) || [];
			for (const tag of tags) {
				allTags.add(tag);
			}
		}

		return { success: true, data: Array.from(allTags).sort() };
	} catch (error) {
		console.error("Failed to fetch user note tags:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
