"use client";

import { Edit3, FileText, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OwnNote } from "@/hooks/use-own-notes";

interface OwnNotesListProps {
	notes: OwnNote[];
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	onEdit: (note: OwnNote) => void;
	onDelete: (noteId: string) => void;
	onCreate: () => void;
	isDeleting?: boolean;
	isUpdating?: boolean;
}

export function OwnNotesList({
	notes,
	currentPage,
	totalPages,
	onPageChange,
	onEdit,
	onDelete,
	onCreate,
	isDeleting = false,
	isUpdating = false,
}: OwnNotesListProps) {
	// Truncate content for preview
	const truncateContent = (content: string, maxLength = 150) => {
		if (content.length <= maxLength) return content;
		return `${content.substring(0, maxLength)}...`;
	};

	if (notes.length === 0) {
		return (
			<div className="text-center py-12">
				<FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
				<h3 className="text-lg font-semibold mb-2">No notes yet</h3>
				<p className="text-muted-foreground mb-4">
					Create your first note to get started with personal note-taking.
				</p>
				<Button onClick={onCreate}>
					<Plus className="h-4 w-4" />
					Create Note
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="grid gap-4">
				{notes.map((note) => (
					<Card
						key={note.id}
						className="group hover:shadow-md transition-shadow"
					>
						<CardHeader>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<CardTitle id={`note-title-${note.id}`} className="text-lg">
										{note.title}
									</CardTitle>
									<div className="flex items-center gap-2 mt-1">
										<Badge variant="secondary" className="capitalize">
											{note.noteType}
										</Badge>
										<span className="text-sm text-muted-foreground">
											{new Date(note.updatedAt).toLocaleDateString()}
										</span>
									</div>
								</div>
								<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
									<Button
										variant="ghost"
										size="icon"
										onClick={() => onEdit(note)}
										disabled={isUpdating}
										aria-label={`Edit note: ${note.title}`}
									>
										<Edit3 className="h-4 w-4" />
									</Button>
									<ConfirmDialog
										title="Delete Note"
										description="This will permanently delete this note. This action cannot be undone."
										onConfirm={() => onDelete(note.id)}
										disabled={isDeleting}
										trigger={
											<Button
												variant="ghost"
												size="icon"
												className="text-destructive hover:text-destructive"
												disabled={isDeleting}
												aria-label={`Delete note: ${note.title}`}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										}
									/>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div
								id={`note-content-${note.id}`}
								className="text-sm text-muted-foreground"
							>
								{truncateContent(note.content)}
							</div>
							{note.content.length > 150 && (
								<Button
									variant="link"
									size="sm"
									className="p-0 h-auto mt-2"
									onClick={() => onEdit(note)}
									aria-label={`Read full content of note: ${note.title}`}
								>
									Read more...
								</Button>
							)}
						</CardContent>
					</Card>
				))}
			</div>
			{totalPages > 1 && (
				<PaginationControls
					currentPage={currentPage}
					totalPages={totalPages}
					onPageChange={onPageChange}
				/>
			)}
		</div>
	);
}
