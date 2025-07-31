"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteGoldenNote, useUpdateGoldenNote } from "@/hooks/use-notes";
import { Check, Copy, MessageSquare, Pencil, Trash2, X } from "lucide-react";

interface NoteCardProps {
	noteId?: string;
	title: string;
	content: string;
	withActions?: boolean;
}

export function NoteCard({
	noteId,
	title,
	content: initialContent,
	withActions,
}: NoteCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [content, setContent] = useState(initialContent);
	const [editedTitle, setEditedTitle] = useState(title);

	const updateNoteMutation = useUpdateGoldenNote();
	const deleteNoteMutation = useDeleteGoldenNote();

	const handleCopy = () => {
		navigator.clipboard.writeText(content);
		toast.success("Note copied to clipboard!");
	};

	const handleDelete = () => {
		if (noteId) {
			deleteNoteMutation.mutate(noteId);
		} else {
			toast.error("Cannot delete note: Missing note ID");
		}
	};

	const handleEdit = () => {
		setIsEditing(true);
	};

	const handleSave = () => {
		if (noteId) {
			const changes: { title?: string; content?: string } = {};
			if (editedTitle !== title) changes.title = editedTitle;
			if (content !== initialContent) changes.content = content;

			if (Object.keys(changes).length > 0) {
				updateNoteMutation.mutate({ id: noteId, ...changes });
			}
		} else {
			toast.error("Cannot save note: Missing note ID");
			return;
		}
		setIsEditing(false);
	};

	const handleCancel = () => {
		setContent(initialContent);
		setEditedTitle(title);
		setIsEditing(false);
	};

	const handleChatNote = () => {
		toast.success("Note chat started.");
	};

	const isLoading =
		updateNoteMutation.isPending || deleteNoteMutation.isPending;

	return (
		<div className="group relative flex h-full flex-col rounded-lg border p-6">
			<div className="flex items-start justify-between">
				{isEditing ? (
					<Input
						value={editedTitle}
						onChange={(e) => setEditedTitle(e.target.value)}
						className="text-lg font-semibold"
						placeholder="Note title"
						disabled={isLoading}
					/>
				) : (
					<h3 className="text-lg font-semibold">{title}</h3>
				)}
				{withActions && !isEditing && (
					<div className="absolute right-2 top-2 flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={handleCopy}
							disabled={isLoading}
						>
							<Copy className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={handleEdit}
							disabled={isLoading}
						>
							<Pencil className="h-4 w-4" />
						</Button>
						<ConfirmDialog
							title="Delete Note"
							description="Are you sure you want to delete this note? This action cannot be undone."
							onConfirm={handleDelete}
							confirmText="Delete"
							variant="destructive"
							trigger={
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									disabled={isLoading}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							}
						/>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={handleChatNote}
							disabled={isLoading}
						>
							<MessageSquare className="h-4 w-4" />
						</Button>
					</div>
				)}
				{isEditing && (
					<div className="flex items-center space-x-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={handleSave}
							disabled={isLoading}
						>
							<Check className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={handleCancel}
							disabled={isLoading}
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				)}
			</div>
			<div className="flex-grow pt-4">
				{isEditing ? (
					<Textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						className="h-full min-h-[120px] resize-y border-input bg-background transition-all duration-200 focus:border-ring focus:ring-2 focus:ring-ring text-base"
						autoFocus
						disabled={isLoading}
						placeholder="Write your note content here..."
						onKeyDown={(e) => {
							// Save on Ctrl/Cmd + Enter
							if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
								e.preventDefault();
								handleSave();
							}
							// Cancel on Escape
							if (e.key === "Escape") {
								e.preventDefault();
								handleCancel();
							}
						}}
					/>
				) : (
					<p className="text-muted-foreground whitespace-pre-wrap min-h-[120px] text-base">
						{content}
					</p>
				)}
			</div>
		</div>
	);
}
