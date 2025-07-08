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
  noteType: string | null;
  tags: unknown;
  isPrivate: boolean | null;
  color: string | null;
  metadata: unknown;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ConflictError = {
  type: "version_conflict";
  message: string;
  serverVersion: number;
  clientVersion: number;
  serverData?: unknown;
};

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

type MutationOptions<TData, TError, TVariables> = {
  onSuccess?: (data: TData, variables: TVariables, context: unknown) => void;
  onError?: (error: TError, variables: TVariables, context: unknown) => void;
};

export function useCreateOwnNote(
  options?: MutationOptions<OwnNote | null, Error, CreateOwnNoteInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOwnNoteInput) => createOwnNote(data),
    onSuccess: (data, variables, context) => {
      if (data) {
        toast.success("Note created successfully!");
        queryClient.invalidateQueries({
          queryKey: ownNotesKeys.all,
        });
      }
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      console.error("Failed to create note:", error);
      toast.error("Failed to create note");
      options?.onError?.(error, variables, context);
    },
  });
}

export function useUpdateOwnNote(
  options?: MutationOptions<OwnNote | null, Error, UpdateOwnNoteInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOwnNoteInput) => updateOwnNote(data),
    onSuccess: (data, variables, context) => {
      if (data) {
        toast.success("Note updated successfully!");
        queryClient.invalidateQueries({
          queryKey: ownNotesKeys.all,
        });
      }
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Don't show a toast here, let the component handle it
      console.error("Failed to update note:", error);
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
        toast.success("Note deleted successfully!");
        queryClient.invalidateQueries({
          queryKey: ownNotesKeys.all,
        });
      }
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      console.error("Failed to delete note:", error);
      toast.error("Failed to delete note");
      options?.onError?.(error, variables, context);
    },
  });
}

export type { CreateOwnNoteInput, UpdateOwnNoteInput };
