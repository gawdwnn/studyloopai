"use client";

import {
	BoldItalicUnderlineToggles,
	CodeToggle,
	CreateLink,
	ListsToggle,
	MDXEditor,
	type MDXEditorMethods,
	Separator,
	UndoRedo,
	codeBlockPlugin,
	headingsPlugin,
	linkPlugin,
	listsPlugin,
	markdownShortcutPlugin,
	quotePlugin,
	tablePlugin,
	toolbarPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import "./mdx-editor-theme.css";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { forwardRef, useMemo } from "react";

interface UnifiedMDXEditorProps {
	content: string;
	onChange?: (markdown: string) => void;
	placeholder?: string;
	readOnly?: boolean;
	className?: string;
	showToolbar?: boolean;
}

const UnifiedMDXEditor = forwardRef<MDXEditorMethods, UnifiedMDXEditorProps>(
	(
		{
			content,
			onChange,
			placeholder = "Write your note here...",
			readOnly = false,
			className,
			showToolbar = true,
		},
		ref
	) => {
		const plugins = useMemo(() => {
			if (readOnly) {
				// For read-only mode, only include essential plugins for rendering
				return [
					headingsPlugin(),
					listsPlugin(),
					quotePlugin(),
					linkPlugin(),
					tablePlugin(),
					codeBlockPlugin({ defaultCodeBlockLanguage: "typescript" }),
				];
			}

			if (showToolbar) {
				// Full editing mode with toolbar
				return [
					headingsPlugin(),
					listsPlugin(),
					quotePlugin(),
					linkPlugin(),
					tablePlugin(),
					codeBlockPlugin({ defaultCodeBlockLanguage: "typescript" }),
					markdownShortcutPlugin(),
					toolbarPlugin({
						toolbarContents: () => (
							<>
								<UndoRedo />
								<Separator />
								<BoldItalicUnderlineToggles />
								<CodeToggle />
								<Separator />
								<ListsToggle />
								<Separator />
								<CreateLink />
							</>
						),
					}),
				];
			}

			// Basic editing mode without toolbar
			return [
				headingsPlugin(),
				listsPlugin(),
				quotePlugin(),
				linkPlugin(),
				tablePlugin(),
				codeBlockPlugin({ defaultCodeBlockLanguage: "typescript" }),
				markdownShortcutPlugin(),
			];
		}, [showToolbar, readOnly]);

		const { theme } = useTheme();

		// Create theme-aware CSS classes for MDXEditor
		const editorThemeClass = useMemo(() => {
			if (theme === "dark") {
				return "mdx-editor-dark";
			}
			return "mdx-editor-light";
		}, [theme]);

		const wrapperClassName = cn("h-full", className);

		return (
			<div className={wrapperClassName}>
				<MDXEditor
					ref={ref}
					markdown={content}
					onChange={onChange}
					plugins={plugins}
					className={editorThemeClass}
					placeholder={readOnly ? undefined : placeholder}
					readOnly={readOnly}
				/>
			</div>
		);
	}
);

UnifiedMDXEditor.displayName = "UnifiedMDXEditor";

export default UnifiedMDXEditor;
