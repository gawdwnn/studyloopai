"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteGoldenNote, useUpdateGoldenNote } from "@/hooks/use-notes";
import { Check, Copy, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";

interface NoteCardProps {
	noteId?: string;
	title: string;
	content: string;
	version?: number;
	withActions?: boolean;
	withMarkdown?: boolean;
}

export function NoteCard({
	noteId,
	title,
	content: initialContent,
	version = 1,
	withActions,
	withMarkdown = false,
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
				updateNoteMutation.mutate({ id: noteId, version, ...changes });
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
		<Card className="group relative h-full">
			<CardHeader>
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
						<CardTitle className="text-lg">{title}</CardTitle>
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
								<Check className="h-4 w-4 text-green-500" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={handleCancel}
								disabled={isLoading}
							>
								<X className="h-4 w-4 text-red-500" />
							</Button>
						</div>
					)}
				</div>
			</CardHeader>
			<CardContent>
				{isEditing ? (
					<Textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						className="min-h-[120px] resize-none"
						autoFocus
						disabled={isLoading}
					/>
				) : withMarkdown ? (
					<MarkdownRenderer content={content} />
				) : (
					<p className="text-muted-foreground whitespace-pre-wrap">{content}</p>
				)}
			</CardContent>
		</Card>
	);
}
