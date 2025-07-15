"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
	type UpdateGoldenNoteInput,
	deleteGoldenNote,
	getNotesData,
	updateGoldenNote,
} from "@/lib/actions/notes";
import { formatErrorForToast } from "@/lib/utils/error-handling";

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
	byCourseAndWeek: (courseId: string, weekId?: string) =>
		[...notesKeys.byCourse(courseId), weekId] as const,
};

export function useNotesData(courseId: string, weekId: string, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: notesKeys.byCourseAndWeek(courseId, weekId),
		queryFn: () => getNotesData(courseId, weekId),
		enabled: options?.enabled ?? !!courseId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
}

export function useUpdateGoldenNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			version,
			...data
		}: { id: string; version: number } & Partial<Omit<UpdateGoldenNoteInput, "id" | "version">>) =>
			updateGoldenNote({ id, version, ...data }),
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
			const message = formatErrorForToast(error, "save note");
			toast.error(message);
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
			const message = formatErrorForToast(error, "delete note");
			toast.error(message);
		},
	});
}

export type { GoldenNote, NotesData, Summary, Week };
