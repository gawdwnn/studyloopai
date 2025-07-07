"use client";

import { cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";

interface MarkdownRendererProps {
	content: string;
	className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
	return (
		<div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
			<MDEditor.Markdown
				source={content}
				style={{
					backgroundColor: "transparent",
					color: "inherit",
				}}
			/>
		</div>
	);
}
