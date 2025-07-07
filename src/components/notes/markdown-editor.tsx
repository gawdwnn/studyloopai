"use client";

import { cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
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
}

export function MarkdownEditor({
	content: initialContent,
	onSave,
	placeholder = "Start writing your notes...",
	className,
	autoSave = true,
	autoSaveDelay = 1000,
	readonly = false,
}: MarkdownEditorProps) {
	const [value, setValue] = useState(initialContent);
	const [lastSavedContent, setLastSavedContent] = useState(initialContent);
	const { resolvedTheme } = useTheme();

	// Determine color mode for MDEditor
	const colorMode = resolvedTheme === "dark" ? "dark" : "light";

	// Update local state when content prop changes
	useEffect(() => {
		setValue(initialContent);
		setLastSavedContent(initialContent);
	}, [initialContent]);

	// Clean up body overflow styles when component unmounts
	useEffect(() => {
		return () => {
			// Reset body styles that MDEditor might have modified
			document.body.style.overflow = "";
			document.documentElement.style.overflow = "";
		};
	}, []);

	// Debounced auto-save function
	const debouncedSave = useDebounceCallback(
		useCallback(
			(content: string) => {
				if (content !== lastSavedContent) {
					onSave(content);
					setLastSavedContent(content);
				}
			},
			[onSave, lastSavedContent]
		),
		autoSaveDelay
	);

	// Handle content change
	const handleChange = useCallback(
		(newValue?: string) => {
			const content = newValue || "";
			setValue(content);

			if (autoSave && !readonly) {
				debouncedSave(content);
			} else if (!readonly) {
				// For non-auto-save mode, call onSave immediately for real-time updates
				onSave(content);
			}
		},
		[autoSave, readonly, debouncedSave, onSave]
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
		<div className={cn("w-full", className)}>
			<MDEditor
				value={value}
				onChange={handleChange}
				data-color-mode={colorMode}
				visibleDragbar={false}
				textareaProps={{
					placeholder,
					style: {
						fontSize: 14,
						lineHeight: 1.5,
						fontFamily: "inherit",
					},
				}}
				preview="edit"
				height={400}
				previewOptions={{
					rehypePlugins: [rehypeSanitize],
				}}
			/>
			{!autoSave && (
				<div className="mt-2 flex justify-end">
					<button
						type="button"
						onClick={handleManualSave}
						disabled={value === lastSavedContent}
						className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
					>
						Save
					</button>
				</div>
			)}
		</div>
	);
}
