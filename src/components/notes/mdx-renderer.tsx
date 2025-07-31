"use client";
import dynamic from "next/dynamic";

// Dynamically import the MDXEditor to avoid SSR issues
const UnifiedMDXEditor = dynamic(
	() => import("@/components/notes/unified-mdx-editor"),
	{
		ssr: false,
		loading: () => (
			<div className="animate-pulse">
				<div className="h-4 bg-muted rounded w-3/4 mb-2" />
				<div className="h-4 bg-muted rounded w-full mb-2" />
				<div className="h-4 bg-muted rounded w-5/6" />
			</div>
		),
	}
);

interface MDXRendererProps {
	content: string;
}

export function MDXRenderer({ content }: MDXRendererProps) {
	return (
		<div className="prose prose-sm max-w-none dark:prose-invert">
			<UnifiedMDXEditor
				content={content}
				readOnly={true}
				showToolbar={false}
				className="mdx-renderer"
			/>
		</div>
	);
}
