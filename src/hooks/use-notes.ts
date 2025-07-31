"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
	type UpdateGoldenNoteInput,
	deleteGoldenNote,
	getAllCourseNotesData,
	updateGoldenNote,
} from "@/lib/actions/notes";
import { logger } from "@/lib/utils/logger";

// Types
interface GoldenNote {
	id: string;
	title: string;
	content: string;
	priority: number | null;
	category: string | null;
	version: number;
	createdAt: Date;
	updatedAt: Date;
	weekId: string;
	courseId: string;
}

interface Summary {
	id: string;
	title: string | null;
	content: string;
	summaryType: string | null;
	wordCount: number | null;
	createdAt: Date;
	updatedAt: Date;
	weekId: string;
	courseId: string;
}

interface Week {
	id: string;
	weekNumber: number;
	title: string | null;
	hasContent: boolean;
	materialTitle: string | null;
}

interface OwnNote {
	id: string;
	title: string;
	content: string;
	noteType: string;
	tags: unknown;
	isPrivate: boolean;
	color: string;
	createdAt: Date;
	updatedAt: Date;
	userId: string;
	weekId: string;
	courseId: string;
}

interface NotesData {
	goldenNotes: GoldenNote[];
	summaries: Summary[];
	weeks: Week[];
	ownNotes: OwnNote[];
}

// Query Keys
const notesKeys = {
	all: ["notes"] as const,
	byCourse: (courseId: string) => [...notesKeys.all, courseId] as const,
};

/**
 * Unified hook that fetches all notes for a course and provides client-side filtering
 */
export function useUnifiedNotesData(
	courseId: string,
	options?: {
		weekId?: string;
		initialData?: NotesData;
		enabled?: boolean;
	}
) {
	return useQuery({
		queryKey: notesKeys.byCourse(courseId), // Single cache key per course
		queryFn: () => getAllCourseNotesData(courseId),
		enabled: options?.enabled ?? !!courseId,
		initialData: options?.initialData,
		staleTime: 10 * 60 * 1000, // Longer stale time (10 minutes) since we cache more data
		gcTime: 30 * 60 * 1000, // Extended GC time (30 minutes)
		select: (data) => {
			// Client-side filtering for specific week if provided
			if (options?.weekId) {
				return {
					...data,
					goldenNotes: data.goldenNotes.filter(
						(note) => note.weekId === options.weekId
					),
					summaries: data.summaries.filter(
						(summary) => summary.weekId === options.weekId
					),
				};
			}
			return data;
		},
	});
}

export function useUpdateGoldenNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			...data
		}: { id: string } & Partial<Omit<UpdateGoldenNoteInput, "id">>) =>
			updateGoldenNote({ id, ...data }),
		onSuccess: (result, _variables) => {
			if (result.success) {
				toast.success("Note updated successfully!");

				queryClient.invalidateQueries({
					queryKey: notesKeys.all,
				});
			} else {
				toast.error("Failed to save note");
			}
		},
		onError: (error) => {
			logger.error("Failed to save note", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				action: "updateGoldenNote",
			});
			toast.error("Failed to save note. Please try again.");
		},
	});
}

export function useDeleteGoldenNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (noteId: string) => deleteGoldenNote(noteId),
		onSuccess: (result, _noteId) => {
			if (result.success) {
				toast.success("Note deleted successfully!");

				queryClient.invalidateQueries({
					queryKey: notesKeys.all,
				});
			} else {
				toast.error("Failed to delete note");
			}
		},
		onError: (error) => {
			logger.error("Failed to delete note", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				action: "deleteGoldenNote",
			});
			toast.error("Failed to delete note. Please try again.");
		},
	});
}

export type { GoldenNote, NotesData, Summary, Week };
