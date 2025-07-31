"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
	type CreateOwnNoteInput,
	type UpdateOwnNoteInput,
	createOwnNote,
	deleteOwnNote,
	getOwnNotes,
	updateOwnNote,
} from "@/lib/actions/own-notes";
import { logger } from "@/lib/utils/logger";

export type NoteType = "general" | "summary" | "question" | "annotation";

export interface OwnNote {
	id: string;
	userId: string;
	weekId: string;
	courseId: string;
	title: string;
	content: string;
	noteType: NoteType | null;
	tags: unknown;
	isPrivate: boolean | null;
	color: string | null;
	metadata: unknown;
	createdAt: Date;
	updatedAt: Date;
}

// Query Keys
const ownNotesKeys = {
	all: ["ownNotes"] as const,
	filtered: (filters: Record<string, unknown>) =>
		[...ownNotesKeys.all, "filtered", filters] as const,
};

export function useOwnNotes(options: {
	weekId: string;
	courseId: string;
	noteType?: NoteType;
	searchQuery?: string;
	tags?: string[];
	page?: number;
	limit?: number;
}) {
	return useQuery({
		queryKey: ownNotesKeys.filtered(options || {}),
		queryFn: () => getOwnNotes(options),
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000, // 5 minutes
		select: (result) => {
			if (!result)
				return {
					notes: [],
					pagination: {
						page: 1,
						limit: 20,
						totalCount: 0,
						totalPages: 0,
						hasNext: false,
						hasPrev: false,
					},
				};
			// Type cast the noteType field to ensure it matches our interface
			const notes = result.notes.map(
				(note): OwnNote => ({
					...note,
					noteType: note.noteType as NoteType | null,
				})
			);
			return {
				notes,
				pagination: result.pagination,
			};
		},
	});
}

type MutationOptions<TData, TError, TVariables> = {
	onSuccess?: (data: TData, variables: TVariables, context: unknown) => void;
	onError?: (error: TError, variables: TVariables, context: unknown) => void;
};

export function useCreateOwnNote(
	options?: MutationOptions<OwnNote | null, Error, CreateOwnNoteInput>
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateOwnNoteInput) => {
			const result = await createOwnNote(data);
			if (!result) return null;
			// Type cast the noteType field
			return {
				...result,
				noteType: result.noteType as NoteType | null,
			} as OwnNote;
		},
		onSuccess: (data, variables, context) => {
			if (data) {
				queryClient.invalidateQueries({
					queryKey: ownNotesKeys.all,
				});
			}
			options?.onSuccess?.(data, variables, context);
		},
		onError: (error, variables, context) => {
			logger.error("Failed to create note", {
				variables,
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			options?.onError?.(error, variables, context);
		},
	});
}

export function useUpdateOwnNote(
	options?: MutationOptions<OwnNote | null, Error, UpdateOwnNoteInput>
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: UpdateOwnNoteInput) => {
			const result = await updateOwnNote(data);
			if (!result) return null;
			// Type cast the noteType field
			return {
				...result,
				noteType: result.noteType as NoteType | null,
			} as OwnNote;
		},
		onSuccess: (data, variables, context) => {
			if (data) {
				queryClient.invalidateQueries({
					queryKey: ownNotesKeys.all,
				});
			}
			options?.onSuccess?.(data, variables, context);
		},
		onError: (error, variables, context) => {
			logger.error("Failed to update note", {
				variables,
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			options?.onError?.(error, variables, context);
		},
	});
}

export function useDeleteOwnNote(
	options?: MutationOptions<boolean, Error, string>
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (noteId: string) => deleteOwnNote(noteId),
		onSuccess: (data, variables, context) => {
			if (data) {
				queryClient.invalidateQueries({
					queryKey: ownNotesKeys.all,
				});
			}
			options?.onSuccess?.(data, variables, context);
		},
		onError: (error, variables, context) => {
			logger.error("Failed to delete note", {
				noteId: variables,
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			options?.onError?.(error, variables, context);
		},
	});
}

export type { CreateOwnNoteInput, UpdateOwnNoteInput };
