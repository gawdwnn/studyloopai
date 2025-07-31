"use client";

import { useFullscreen } from "@/components/fullscreen-context";
import { Button } from "@/components/ui/button";
import {
	EnhancedSheet,
	EnhancedSheetContent,
	type EnhancedSheetContentProps,
	EnhancedSheetHeader,
	EnhancedSheetTitle,
} from "@/components/ui/enhanced-sheet";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { NoteType, OwnNote } from "@/hooks/use-own-notes";
import { Keyboard, Maximize2, Minimize, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";

// Dynamic import for MDXEditor to ensure client-side only rendering
const UnifiedMDXEditor = dynamic(() => import("./unified-mdx-editor"), {
	ssr: false,
	loading: () => (
		<div className="h-64 border rounded-md flex items-center justify-center">
			<div className="text-muted-foreground">Loading editor...</div>
		</div>
	),
});

type SheetSize = "compact" | "expanded" | "fullscreen";

interface NoteEditorSheetProps {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	note: OwnNote | null;
	onSave: (
		note: OwnNote | null,
		content: string,
		title: string,
		noteType: NoteType
	) => void;
	isLoading: boolean;
}

export function NoteEditorSheet({
	isOpen,
	onOpenChange,
	note,
	onSave,
	isLoading,
}: NoteEditorSheetProps) {
	const [title, setTitle] = useState(note?.title || "");
	const [content, setContent] = useState(note?.content || "");
	const [noteType, setNoteType] = useState<NoteType>(
		note?.noteType || "general"
	);
	const [sheetSize, setSheetSize] = useState<SheetSize>("compact");
	const { isFullscreen, toggleFullscreen } = useFullscreen();

	const sheetRef = useRef<HTMLDivElement>(null);

	// Reset state when dialog opens/closes or note changes
	useEffect(() => {
		if (isOpen) {
			setTitle(note?.title || "");
			setContent(note?.content || "");
			setNoteType(note?.noteType || "general");
			setSheetSize("compact");
		} else {
			// Reset state when sheet closes to prevent data leakage
			setTimeout(() => {
				setTitle("");
				setContent("");
				setNoteType("general");
				setSheetSize("compact");
			}, 300); // Wait for animation to complete
		}
	}, [isOpen, note]);

	// Handle fullscreen changes
	useEffect(() => {
		if (!isFullscreen && sheetSize === "fullscreen") {
			setSheetSize("expanded");
		}
	}, [isFullscreen, sheetSize]);

	const handleSave = useCallback(() => {
		if (content.trim()) {
			onSave(note, content, title.trim() || "Untitled Note", noteType);
		}
	}, [content, note, onSave, title, noteType]);

	const handleClose = useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);

	const handleToggleFullscreen = useCallback(async () => {
		try {
			await toggleFullscreen();
			if (isFullscreen) {
				setSheetSize("expanded");
			} else {
				setSheetSize("fullscreen");
			}
		} catch (_error) {
			toast.error("Failed to toggle fullscreen");
		}
	}, [toggleFullscreen, isFullscreen]);

	// Keyboard shortcuts
	useHotkeys("cmd+enter,ctrl+enter", handleSave, {
		enabled: isOpen,
		preventDefault: true,
	});

	useHotkeys("escape", handleClose, {
		enabled: isOpen && !isFullscreen,
		preventDefault: true,
	});

	useHotkeys("cmd+shift+f,ctrl+shift+f,f11", handleToggleFullscreen, {
		enabled: isOpen,
		preventDefault: true,
	});

	const noteTypes = useMemo(
		() => [
			{ value: "general", label: "General" },
			{ value: "summary", label: "Summary" },
			{ value: "question", label: "Question" },
		],
		[]
	);

	// Calculate sheet content props based on current size
	const sheetContentProps: Partial<EnhancedSheetContentProps> = useMemo(() => {
		if (isFullscreen) {
			return {
				size: "fullscreen",
				side: "bottom",
				hideCloseButton: true,
			};
		}
		return {
			size: sheetSize,
			side: "bottom",
			hideCloseButton: false,
		};
	}, [sheetSize, isFullscreen]);

	return (
		<EnhancedSheet open={isOpen} onOpenChange={onOpenChange}>
			<EnhancedSheetContent
				ref={sheetRef}
				className="flex flex-col"
				{...sheetContentProps}
			>
				<EnhancedSheetHeader className="flex-shrink-0">
					<div className="flex items-center justify-between">
						<EnhancedSheetTitle>
							{note ? "Edit Note" : "Create New Note"}
						</EnhancedSheetTitle>
						<div className="flex items-center gap-2 pr-12">
							{/* Keyboard shortcuts hint */}
							<Button
								variant="ghost"
								size="sm"
								className="h-8 px-2 text-xs text-muted-foreground"
								onClick={() => {
									toast.info("Keyboard Shortcuts", {
										description:
											"⌘+Enter: Save • ⌘+Shift+F: Fullscreen • Esc: Close",
									});
								}}
							>
								<Keyboard className="h-3 w-3 mr-1" />
								Shortcuts
							</Button>

							{/* Fullscreen toggle */}
							<Button
								variant="ghost"
								size="sm"
								onClick={handleToggleFullscreen}
								disabled={isLoading}
								title={
									isFullscreen
										? "Exit Fullscreen (F11)"
										: "Enter Fullscreen (F11)"
								}
							>
								{isFullscreen ? (
									<Minimize className="h-4 w-4" />
								) : (
									<Maximize2 className="h-4 w-4" />
								)}
							</Button>
						</div>
					</div>

					{/* Note metadata controls */}
					<div className="flex flex-col sm:flex-row gap-4 mt-4">
						<Input
							placeholder="Note title..."
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className="text-lg font-semibold flex-1"
							disabled={isLoading}
						/>
						<Select
							value={noteType}
							onValueChange={(value) => setNoteType(value as NoteType)}
							disabled={isLoading}
						>
							<SelectTrigger className="w-full sm:w-40">
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
				</EnhancedSheetHeader>

				{/* MDX Editor */}
				<div className="flex-1 px-4 pb-4 min-h-0 overflow-auto">
					<UnifiedMDXEditor
						content={content}
						onChange={setContent}
						placeholder="Write your note here..."
						readOnly={false}
						showToolbar={true}
					/>
				</div>

				{/* Action buttons */}
				<div className="flex justify-end gap-2 p-3 border-t bg-background/95 backdrop-blur">
					<Button variant="outline" onClick={handleClose} disabled={isLoading}>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={isLoading || !content.trim()}
						className="min-w-[120px]"
					>
						{isLoading && (
							<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-0 border-current" />
						)}
						<Save className="h-4 w-4 mr-2" />
						{isLoading
							? note
								? "Saving..."
								: "Creating..."
							: note
								? "Save Changes"
								: "Create Note"}
					</Button>
				</div>
			</EnhancedSheetContent>
		</EnhancedSheet>
	);
}
