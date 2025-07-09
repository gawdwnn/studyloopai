"use client";

import { cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
import { useTheme } from "next-themes";
import { useCallback, useState } from "react";
import rehypeSanitize from "rehype-sanitize";

interface MarkdownEditorProps {
	content: string;
	onSave: (content: string) => void;
	placeholder?: string;
	className?: string;
	readonly?: boolean;
	height?: number;
}

export function MarkdownEditor({
	content: initialContent,
	onSave,
	placeholder = "Start writing your notes...",
	className,
	readonly = false,
	height = 600,
}: MarkdownEditorProps) {
	const { resolvedTheme } = useTheme();
	const [value, setValue] = useState(initialContent);

	const colorMode = resolvedTheme === "dark" ? "dark" : "light";

	const handleChange = useCallback(
		(newValue?: string) => {
			const content = newValue || "";
			setValue(content);
			onSave(content);
		},
		[onSave]
	);

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
			<MDEditor
				value={value}
				onChange={handleChange}
				data-color-mode={colorMode}
				visibleDragbar={false}
				textareaProps={{
					placeholder,
					"aria-label": "Markdown editor content",
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
