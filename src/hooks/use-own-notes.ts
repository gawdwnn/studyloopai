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

// Query Keys
const ownNotesKeys = {
	all: ["ownNotes"] as const,
	byCourse: (courseId: string) => [...ownNotesKeys.all, courseId] as const,
	byMaterial: (materialId: string) => [...ownNotesKeys.all, "material", materialId] as const,
	filtered: (filters: Record<string, unknown>) =>
		[...ownNotesKeys.all, "filtered", filters] as const,
};

// Hook for fetching own notes with filtering
export function useOwnNotes(options?: {
	materialId?: string;
	courseId?: string;
	noteType?: string;
	searchQuery?: string;
	tags?: string[];
}) {
	return useQuery({
		queryKey: ownNotesKeys.filtered(options || {}),
		queryFn: () => getOwnNotes(options),
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000, // 5 minutes
		select: (result) => result.data || [],
	});
}

// Hook for creating own notes
export function useCreateOwnNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateOwnNoteInput) => createOwnNote(data),
		onSuccess: (result) => {
			if (result.success) {
				toast.success("Note created successfully!");

				// Invalidate and refetch own notes
				queryClient.invalidateQueries({
					queryKey: ownNotesKeys.all,
				});
			} else {
				toast.error(result.error || "Failed to create note");
			}
		},
		onError: (error) => {
			console.error("Failed to create note:", error);
			toast.error("Failed to create note");
		},
	});
}

// Hook for updating own notes
export function useUpdateOwnNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: UpdateOwnNoteInput) => updateOwnNote(data),
		onSuccess: (result) => {
			if (result.success) {
				toast.success("Note updated successfully!");

				// Invalidate and refetch own notes
				queryClient.invalidateQueries({
					queryKey: ownNotesKeys.all,
				});
			} else {
				toast.error(result.error || "Failed to update note");
			}
		},
		onError: (error) => {
			console.error("Failed to update note:", error);
			toast.error("Failed to update note");
		},
	});
}

// Hook for deleting own notes
export function useDeleteOwnNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (noteId: string) => deleteOwnNote(noteId),
		onSuccess: (result) => {
			if (result.success) {
				toast.success("Note deleted successfully!");

				// Invalidate and refetch own notes
				queryClient.invalidateQueries({
					queryKey: ownNotesKeys.all,
				});
			} else {
				toast.error(result.error || "Failed to delete note");
			}
		},
		onError: (error) => {
			console.error("Failed to delete note:", error);
			toast.error("Failed to delete note");
		},
	});
}

// Export types for use in components
export type { CreateOwnNoteInput, UpdateOwnNoteInput };
