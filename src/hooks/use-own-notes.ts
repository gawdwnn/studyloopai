"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
	type CreateOwnNoteInput,
	type UpdateOwnNoteInput,
	createOwnNote,
	deleteOwnNote,
	getOwnNotes,
	updateOwnNote,
} from "@/lib/actions/own-notes";

// Types
export interface OwnNote {
	id: string;
	userId: string;
	weekId: string;
	courseId: string;
	title: string;
	content: string;
	noteType: string;
	tags: string[];
	isPrivate: boolean;
	color: string;
	metadata: Record<string, unknown>;
	version: number;
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
	noteType?: string;
	searchQuery?: string;
	tags?: string[];
}) {
	return useQuery({
		queryKey: ownNotesKeys.filtered(options || {}),
		queryFn: () => getOwnNotes(options),
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000, // 5 minutes
		select: (result) => result || [],
	});
}

export function useCreateOwnNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateOwnNoteInput) => createOwnNote(data),
		onSuccess: (result) => {
			if (result) {
				toast.success("Note created successfully!");

				queryClient.invalidateQueries({
					queryKey: ownNotesKeys.all,
				});
			}
		},
		onError: (error) => {
			console.error("Failed to create note:", error);
			toast.error("Failed to create note");
		},
	});
}

export function useUpdateOwnNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: UpdateOwnNoteInput) => updateOwnNote(data),
		onSuccess: (result) => {
			if (result) {
				toast.success("Note updated successfully!");

				queryClient.invalidateQueries({
					queryKey: ownNotesKeys.all,
				});
			}
		},
		onError: (error) => {
			console.error("Failed to update note:", error);
			toast.error("Failed to update note");
		},
	});
}

export function useDeleteOwnNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (noteId: string) => deleteOwnNote(noteId),
		onSuccess: (result) => {
			if (result) {
				toast.success("Note deleted successfully!");

				queryClient.invalidateQueries({
					queryKey: ownNotesKeys.all,
				});
			}
		},
		onError: (error) => {
			console.error("Failed to delete note:", error);
			toast.error("Failed to delete note");
		},
	});
}

export type { CreateOwnNoteInput, UpdateOwnNoteInput };
