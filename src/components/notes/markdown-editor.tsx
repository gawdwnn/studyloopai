"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDraft } from "@/hooks/use-draft";
import { cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
import { Clock, Save } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import rehypeSanitize from "rehype-sanitize";

interface MarkdownEditorProps {
	content: string;
	onSave: (content: string) => void;
	placeholder?: string;
	className?: string;
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
	readonly = false,
	enableDraftSave = true,
	draftKey = "markdown-draft",
	height = 600,
}: MarkdownEditorProps) {
	const { resolvedTheme } = useTheme();

	const {
		content: value,
		updateContent,
		hasDraft,
		lastSaved: lastDraftSave,
		saveStatus: draftSaveStatus,
		isLoading: isDraftLoading,
	} = useDraft({
		context: draftKey,
		initialContent,
		autoSave: enableDraftSave,
		autoSaveDelay: enableDraftSave ? 2000 : 0,
		onContentChange: (content) => {
			// Always notify parent to keep state synchronized
			onSave(content);
		},
	});

	const colorMode = resolvedTheme === "dark" ? "dark" : "light";

	const handleChange = useCallback(
		(newValue?: string) => {
			const content = newValue || "";
			// Always update draft content first
			updateContent(content);
		},
		[updateContent]
	);

	// Manual save function - saves current content to parent (actual save)
	const handleManualSave = useCallback(() => {
		onSave(value);
	}, [value, onSave]);

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
								{isDraftLoading && "Loading draft..."}
								{!isDraftLoading && draftSaveStatus === "saving" && "Saving draft..."}
								{!isDraftLoading &&
									draftSaveStatus === "saved" &&
									lastDraftSave &&
									`Draft saved ${lastDraftSave.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
								{!isDraftLoading && draftSaveStatus === "idle" && hasDraft && "Draft available"}
								{!isDraftLoading && draftSaveStatus === "error" && "Save failed"}
							</Badge>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					{/* Always show manual save button when not in readonly mode */}
					{!readonly && (
						<Button size="sm" variant="outline" onClick={handleManualSave}>
							<Save className="h-3 w-3 mr-1" />
							{enableDraftSave ? "Save Note" : "Save"}
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
			/>
		</div>
	);
}
