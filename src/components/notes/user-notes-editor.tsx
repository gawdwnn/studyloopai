"use client";

import { FileText, Filter, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type CreateOwnNoteInput,
	type NoteType,
	type OwnNote,
	useCreateOwnNote,
	useDeleteOwnNote,
	useOwnNotes,
	useUpdateOwnNote,
} from "@/hooks/use-own-notes";
import { logger } from "@/lib/utils/logger";
import { toast } from "sonner";
import { NoteEditorSheet } from "./note-editor-sheet";
import { OwnNotesList } from "./own-notes-list";

interface UserNotesEditorProps {
	courseId: string;
	weekId: string;
}

export function UserNotesEditor({ courseId, weekId }: UserNotesEditorProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [selectedNoteType, setSelectedNoteType] = useState<string>("all");

	const debouncedSetSearchQuery = useDebounceCallback(setSearchQuery, 300);
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [editingNote, setEditingNote] = useState<OwnNote | null>(null);

	const [currentPage, setCurrentPage] = useState(1);
	const notesPerPage = 5;

	const {
		data: notesData,
		isLoading,
		error,
	} = useOwnNotes({
		courseId,
		weekId,
		searchQuery: searchQuery || undefined,
		noteType:
			selectedNoteType === "all" ? undefined : (selectedNoteType as NoteType),
		page: currentPage,
		limit: notesPerPage,
	});

	// Extract notes and pagination from the response
	const notes = notesData?.notes || [];
	const pagination = notesData?.pagination || {
		page: 1,
		limit: notesPerPage,
		totalCount: 0,
		totalPages: 0,
		hasNext: false,
		hasPrev: false,
	};

	const createNoteMutation = useCreateOwnNote({
		onSuccess: () => {
			toast.success("Note created successfully");
			setIsEditorOpen(false);
		},
		onError: (error: Error) => {
			logger.error("Note creation failed", {
				message: error.message,
				stack: error.stack,
				courseId,
				weekId,
			});
			toast.error("Error creating note", {
				description: "Please try again later.",
			});
		},
	});

	const updateNoteMutation = useUpdateOwnNote({
		onSuccess: () => {
			toast.success("Note updated successfully");
			setIsEditorOpen(false);
			setEditingNote(null);
		},
		onError: (error: Error) => {
			toast.error("Error updating note", {
				description: error.message,
			});
		},
	});

	const deleteNoteMutation = useDeleteOwnNote({
		onSuccess: () => {
			toast.success("Note deleted successfully");
		},
		onError: (error: Error) => {
			logger.error("Note deletion failed", {
				message: error.message,
				stack: error.stack,
				courseId,
				weekId,
			});
			toast.error("Error deleting note", {
				description: "Please try again later.",
			});
		},
	});

	const handleCreateNote = (
		content: string,
		title: string,
		noteType: NoteType
	) => {
		const newNote: CreateOwnNoteInput = {
			courseId,
			weekId,
			title: title || "Untitled Note",
			content,
			noteType,
			tags: [],
			isPrivate: true,
			color: "#ffffff",
		};
		createNoteMutation.mutate(newNote);
	};

	const handleUpdateNote = (
		note: OwnNote,
		content: string,
		title: string,
		noteType: NoteType
	) => {
		updateNoteMutation.mutate({
			id: note.id,
			content,
			title,
			noteType,
		});
	};

	const handleDeleteNote = (noteId: string) => {
		deleteNoteMutation.mutate(noteId);
	};

	const handleOpenCreate = () => {
		setEditingNote(null);
		setIsEditorOpen(true);
	};

	const handleOpenEdit = (note: OwnNote) => {
		setEditingNote(note);
		setIsEditorOpen(true);
	};

	const noteTypes = [
		{ value: "all", label: "All Notes" },
		{ value: "general", label: "General" },
		{ value: "summary", label: "Summary" },
		{ value: "question", label: "Question" },
	];

	// Reset to page 1 when search or filter changes
	const handleSearchChange = (value: string) => {
		setSearchInput(value);
		debouncedSetSearchQuery(value);
		setCurrentPage(1);
	};

	const handleNoteTypeChange = (value: string) => {
		setSelectedNoteType(value);
		setCurrentPage(1);
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="flex items-center gap-4">
					<Skeleton className="h-10 flex-1" />
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-32" />
				</div>
				<div className="grid gap-4">
					{[1, 2, 3].map((id) => (
						<Card key={`skeleton-${id}`}>
							<CardHeader>
								<Skeleton className="h-6 w-3/4" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-24 w-full" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-8">
				<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
				<h3 className="text-lg font-semibold mb-2">Unable to load notes</h3>
				<p className="text-muted-foreground">Please try again later.</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header with controls */}
			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search your notes..."
						value={searchInput}
						onChange={(e) => handleSearchChange(e.target.value)}
						className="pl-10"
					/>
				</div>

				<Select value={selectedNoteType} onValueChange={handleNoteTypeChange}>
					<SelectTrigger className="w-40">
						<Filter className="h-4 w-4" />
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{noteTypes.map((type) => (
							<SelectItem key={type.value} value={type.value}>
								{type.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Button onClick={handleOpenCreate}>
					<Plus className="h-4 w-4" />
					New Note
				</Button>

				<NoteEditorSheet
					isOpen={isEditorOpen}
					onOpenChange={setIsEditorOpen}
					note={editingNote}
					onSave={(note, content, title, noteType) => {
						if (note) {
							handleUpdateNote(note, content, title, noteType);
						} else {
							handleCreateNote(content, title, noteType);
						}
					}}
					isLoading={
						createNoteMutation.isPending || updateNoteMutation.isPending
					}
				/>
			</div>

			<OwnNotesList
				notes={notes}
				currentPage={pagination.page}
				totalPages={pagination.totalPages}
				onPageChange={setCurrentPage}
				onEdit={handleOpenEdit}
				onDelete={handleDeleteNote}
				onCreate={handleOpenCreate}
				isDeleting={deleteNoteMutation.isPending}
				isUpdating={updateNoteMutation.isPending}
			/>
		</div>
	);
}
