"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
	type UpdateGoldenNoteInput,
	deleteGoldenNote,
	getNotesData,
	getUserCoursesForNotes,
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

interface Course {
	id: string;
	name: string;
	description: string | null;
	createdAt: Date;
}

interface NotesData {
	goldenNotes: GoldenNote[];
	summaries: Summary[];
	weeks: Week[];
}

// Query Keys
const notesKeys = {
	all: ["notes"] as const,
	courses: ["notes", "courses"] as const,
	byCourse: (courseId: string) => [...notesKeys.all, courseId] as const,
	byCourseAndWeek: (courseId: string, weekId?: string) =>
		[...notesKeys.byCourse(courseId), weekId] as const,
};

// Custom hook for fetching user courses
export function useUserCourses() {
	return useQuery({
		queryKey: notesKeys.courses,
		queryFn: () => getUserCoursesForNotes(),
		staleTime: 10 * 60 * 1000, // 10 minutes (courses change less frequently)
		gcTime: 15 * 60 * 1000, // 15 minutes
	});
}

// Custom hook for fetching notes data
export function useNotesData(courseId: string, weekId?: string) {
	return useQuery({
		queryKey: notesKeys.byCourseAndWeek(courseId, weekId),
		queryFn: () => getNotesData(courseId, weekId),
		enabled: !!courseId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
}

// Custom hook for updating golden notes
export function useUpdateGoldenNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & Partial<UpdateGoldenNoteInput>) =>
			updateGoldenNote({ id, ...data }),
		onSuccess: (result, _variables) => {
			if (result.success) {
				toast.success("Note updated successfully!");

				// Invalidate and refetch notes data
				queryClient.invalidateQueries({
					queryKey: notesKeys.all,
				});
			} else {
				toast.error(result.error || "Failed to save note");
			}
		},
		onError: (error) => {
			const message = formatErrorForToast(error, "save note");
			toast.error(message);
		},
	});
}

// Custom hook for deleting golden notes
export function useDeleteGoldenNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (noteId: string) => deleteGoldenNote(noteId),
		onSuccess: (result, _noteId) => {
			if (result.success) {
				toast.success("Note deleted successfully!");

				// Invalidate and refetch notes data
				queryClient.invalidateQueries({
					queryKey: notesKeys.all,
				});
			} else {
				toast.error(result.error || "Failed to delete note");
			}
		},
		onError: (error) => {
			const message = formatErrorForToast(error, "delete note");
			toast.error(message);
		},
	});
}

// Export types for use in components
export type { GoldenNote, Summary, Week, Course, NotesData };
