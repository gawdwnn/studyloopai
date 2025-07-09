import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { NoteType, OwnNote } from "@/hooks/use-own-notes";
import { useEffect, useState } from "react";
import { MarkdownEditor } from "./markdown-editor";

interface NoteEditorDialogProps {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	note: OwnNote | null;
	onSave: (note: OwnNote | null, content: string, title: string, noteType: NoteType) => void;
	isLoading: boolean;
}

export function NoteEditorDialog({
	isOpen,
	onOpenChange,
	note,
	onSave,
	isLoading,
}: NoteEditorDialogProps) {
	const [title, setTitle] = useState(note?.title || "");
	const [content, setContent] = useState(note?.content || "");
	const [noteType, setNoteType] = useState<NoteType>(note?.noteType || "general");

	useEffect(() => {
		if (isOpen) {
			setTitle(note?.title || "");
			setContent(note?.content || "");
			setNoteType(note?.noteType || "general");
		} else {
			// Reset state when dialog closes to prevent data leakage
			setTitle("");
			setContent("");
			setNoteType("general");
		}
	}, [isOpen, note]);

	const handleSave = () => {
		if (content.trim()) {
			onSave(note, content, title.trim() || "Untitled Note", noteType);
		}
	};

	const noteTypes = [
		{ value: "general", label: "General" },
		{ value: "summary", label: "Summary" },
		{ value: "question", label: "Question" },
	];

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>{note ? "Edit Note" : "Create New Note"}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 flex-1 flex flex-col min-h-0">
					<div className="flex gap-4">
						<Input
							placeholder="Note title..."
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className="text-lg font-semibold flex-1"
						/>
						<Select value={noteType} onValueChange={(value) => setNoteType(value as NoteType)}>
							<SelectTrigger className="w-40">
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
					</div>
					<div className="flex-1 min-h-0">
						<MarkdownEditor
							content={content}
							onSave={(newContent) => {
								setContent(newContent);
							}}
							placeholder="Start writing your note..."
							height={500}
							enableDraftSave={true}
							draftKey={note ? `edit-note-${note.id}` : "new-note-draft"}
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={isLoading || !content.trim()}>
							{isLoading
								? note
									? "Saving..."
									: "Creating..."
								: note
									? "Save Changes"
									: "Create Note"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
