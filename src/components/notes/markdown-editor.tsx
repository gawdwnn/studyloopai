"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDraft } from "@/hooks/use-draft";
import { cn } from "@/lib/utils";
import MDEditor, { commands } from "@uiw/react-md-editor";
import { Clock, Save } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import rehypeSanitize from "rehype-sanitize";
import { useDebounceCallback } from "usehooks-ts";

interface MarkdownEditorProps {
	content: string;
	onSave: (content: string) => void;
	placeholder?: string;
	className?: string;
	autoSave?: boolean;
	autoSaveDelay?: number;
	readonly?: boolean;
	enableDraftSave?: boolean;
	draftKey?: string;
	height?: number;
}

export function MarkdownEditor({
	content: initialContent,
	onSave,
	placeholder = "Start writing your notes...",
	className,
	autoSave = true,
	autoSaveDelay = 1000,
	readonly = false,
	enableDraftSave = true,
	draftKey = "markdown-draft",
	height = 600,
}: MarkdownEditorProps) {
	const [lastSavedContent, setLastSavedContent] = useState(initialContent);
	const { resolvedTheme } = useTheme();

	const {
		content: value,
		updateContent,
		hasDraft,
		lastSaved: lastDraftSave,
		saveStatus: draftSaveStatus,
	} = useDraft({
		context: draftKey,
		initialContent,
		autoSave: enableDraftSave,
		autoSaveDelay: enableDraftSave ? 2000 : 0,
		onContentChange: (content) => {
			// Always notify parent component of content changes
			if (!enableDraftSave || !autoSave) {
				onSave(content);
			}
		},
	});

	const colorMode = resolvedTheme === "dark" ? "dark" : "light";

	// Update saved content when initial content changes
	useEffect(() => {
		setLastSavedContent(initialContent);
	}, [initialContent]);

	const debouncedSave = useDebounceCallback((content: string) => {
		onSave(content);
		setLastSavedContent(content);
	}, autoSaveDelay);

	const handleChange = useCallback(
		(newValue?: string) => {
			const content = newValue || "";

			updateContent(content);

			if (autoSave && !readonly && !enableDraftSave) {
				// Only use debounced save if not using draft system
				debouncedSave(content);
			}
		},
		[autoSave, readonly, debouncedSave, enableDraftSave, updateContent]
	);

	// Manual save function
	const handleManualSave = useCallback(() => {
		if (value !== lastSavedContent) {
			onSave(value);
			setLastSavedContent(value);
		}
	}, [value, lastSavedContent, onSave]);

	if (readonly) {
		return (
			<div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
				<MDEditor.Markdown
					source={value}
					style={{
						backgroundColor: "transparent",
						color: "inherit",
					}}
					rehypePlugins={[rehypeSanitize]}
				/>
			</div>
		);
	}

	return (
		<div className={cn("w-full relative", className)}>
			<div className="flex items-center justify-between mb-2 p-2 bg-muted/50 rounded-t-md border border-b-0">
				<div className="flex items-center gap-2">
					{enableDraftSave && (
						<div className="flex items-center gap-2">
							<Clock className="h-3 w-3 text-muted-foreground" />
							<Badge
								id="draft-status"
								variant={draftSaveStatus === "saved" ? "secondary" : "outline"}
								className="text-xs"
								aria-live="polite"
							>
								{draftSaveStatus === "saving" && "Saving draft..."}
								{draftSaveStatus === "saved" &&
									lastDraftSave &&
									`Draft saved ${lastDraftSave.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
								{draftSaveStatus === "idle" && hasDraft && "Draft available"}
								{draftSaveStatus === "error" && "Save failed"}
							</Badge>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					{!autoSave && (
						<Button size="sm" variant="outline" onClick={handleManualSave}>
							<Save className="h-3 w-3 mr-1" />
							Save
						</Button>
					)}
				</div>
			</div>

			<MDEditor
				value={value}
				onChange={handleChange}
				data-color-mode={colorMode}
				visibleDragbar={false}
				textareaProps={{
					placeholder,
					"aria-label": "Markdown editor content",
					"aria-describedby": enableDraftSave ? "draft-status" : undefined,
					style: {
						fontSize: 14,
						lineHeight: 1.5,
						fontFamily: "inherit",
					},
				}}
				preview="edit"
				height={height}
				previewOptions={{
					rehypePlugins: [rehypeSanitize],
				}}
				extraCommands={[commands.fullscreen]}
			/>
		</div>
	);
}
