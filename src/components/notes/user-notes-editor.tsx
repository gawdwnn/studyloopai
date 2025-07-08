"use client";

import { Edit3, FileText, Filter, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
	type OwnNote,
	useCreateOwnNote,
	useDeleteOwnNote,
	useOwnNotes,
	useUpdateOwnNote,
} from "@/hooks/use-own-notes";
import { MarkdownEditor } from "./markdown-editor";
import { MarkdownRenderer } from "./markdown-renderer";

interface UserNotesEditorProps {
	courseId: string;
	weekId: string;
}

export function UserNotesEditor({ courseId, weekId }: UserNotesEditorProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedNoteType, setSelectedNoteType] = useState<string>("all");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [editingNote, setEditingNote] = useState<string | null>(null);

	// Fetch notes with filters
	const {
		data: notes = [] as OwnNote[],
		isLoading,
		error,
	} = useOwnNotes({
		courseId,
		weekId,
		searchQuery: searchQuery || undefined,
		noteType: selectedNoteType === "all" ? undefined : selectedNoteType,
	});

	const createNoteMutation = useCreateOwnNote();
	const updateNoteMutation = useUpdateOwnNote();
	const deleteNoteMutation = useDeleteOwnNote();

	const handleCreateNote = (content: string, title: string) => {
		createNoteMutation.mutate({
			courseId,
			weekId,
			title: title || "Untitled Note",
			content,
			noteType: "general",
			tags: [],
			isPrivate: true,
			color: "#ffffff",
		});
		setIsCreateDialogOpen(false);
	};

	const handleUpdateNote = (noteId: string, content: string) => {
		const note = notes.find((n) => n.id === noteId);
		if (!note) return;

		updateNoteMutation.mutate({
			id: noteId,
			content,
			version: note.version,
		});
	};

	const handleDeleteNote = (noteId: string) => {
		deleteNoteMutation.mutate(noteId);
	};

	const noteTypes = [
		{ value: "all", label: "All Notes" },
		{ value: "general", label: "General" },
		{ value: "annotation", label: "Annotation" },
		{ value: "summary", label: "Summary" },
		{ value: "question", label: "Question" },
	];

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
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>

				<Select value={selectedNoteType} onValueChange={setSelectedNoteType}>
					<SelectTrigger className="w-40">
						<Filter className="h-4 w-4 mr-2" />
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

				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							New Note
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
						<DialogHeader>
							<DialogTitle>Create New Note</DialogTitle>
						</DialogHeader>
						<CreateNoteForm
							onSave={handleCreateNote}
							onCancel={() => setIsCreateDialogOpen(false)}
							isLoading={createNoteMutation.isPending}
						/>
					</DialogContent>
				</Dialog>
			</div>

			{/* Notes list */}
			{notes.length === 0 ? (
				<div className="text-center py-12">
					<FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
					<h3 className="text-lg font-semibold mb-2">No notes yet</h3>
					<p className="text-muted-foreground mb-4">
						Create your first note to get started with personal note-taking.
					</p>
					<Button onClick={() => setIsCreateDialogOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Create Note
					</Button>
				</div>
			) : (
				<div className="grid gap-4">
					{notes.map((note) => (
						<Card key={note.id} className="group">
							<CardHeader>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<CardTitle className="text-lg">{note.title}</CardTitle>
										<div className="flex items-center gap-2 mt-1">
											<Badge variant="secondary" className="capitalize">
												{note.noteType}
											</Badge>
											<span className="text-sm text-muted-foreground">
												{new Date(note.updatedAt).toLocaleDateString()}
											</span>
										</div>
									</div>
									<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => setEditingNote(editingNote === note.id ? null : note.id)}
											disabled={updateNoteMutation.isPending}
										>
											<Edit3 className="h-4 w-4" />
										</Button>
										<ConfirmDialog
											title="Delete Note"
											description="This will permanently delete this note. This action cannot be undone."
											onConfirm={() => handleDeleteNote(note.id)}
											disabled={deleteNoteMutation.isPending}
											trigger={
												<Button
													variant="ghost"
													size="icon"
													className="text-destructive hover:text-destructive"
													disabled={deleteNoteMutation.isPending}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											}
										/>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{editingNote === note.id ? (
									<MarkdownEditor
										content={note.content}
										onSave={(content) => {
											handleUpdateNote(note.id, content);
											setEditingNote(null);
										}}
										placeholder="Edit your note..."
										autoSave={false}
										height={400}
										enableFullscreen={true}
										enableDraftSave={true}
										draftKey={`edit-note-${note.id}`}
									/>
								) : (
									<MarkdownRenderer content={note.content} />
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

// Create note form component
interface CreateNoteFormProps {
	onSave: (content: string, title: string) => void;
	onCancel: () => void;
	isLoading: boolean;
}

function CreateNoteForm({ onSave, onCancel, isLoading }: CreateNoteFormProps) {
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");

	const handleSave = () => {
		if (content.trim()) {
			onSave(content, title.trim() || "Untitled Note");
		}
	};

	const handleContentChange = (newContent: string) => {
		setContent(newContent);
	};

	return (
		<div className="space-y-4">
			<Input
				placeholder="Note title..."
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				className="text-lg font-semibold"
			/>
			<div className="min-h-96 overflow-hidden">
				<MarkdownEditor
					content={content}
					onSave={handleContentChange}
					placeholder="Start writing your note..."
					autoSave={false}
					height={500}
					enableFullscreen={true}
					enableDraftSave={true}
					draftKey="new-note-draft"
				/>
			</div>
			<div className="flex justify-end gap-2">
				<Button variant="outline" onClick={onCancel} disabled={isLoading}>
					Cancel
				</Button>
				<Button onClick={handleSave} disabled={isLoading || !content.trim()}>
					{isLoading ? "Creating..." : "Create Note"}
				</Button>
			</div>
		</div>
	);
}
