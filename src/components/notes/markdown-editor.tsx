"use client";

import { cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
import { useTheme } from "next-themes";
import { useCallback, useState } from "react";
import rehypeSanitize from "rehype-sanitize";

interface MarkdownEditorProps {
  content: string;
  onSave: (content: string) => void;
  className?: string;
}

export function MarkdownEditor({
  content: initialContent,
  onSave,
  className,
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

  return (
    <div className={cn("w-full relative", className)}>
      <MDEditor
        value={value}
        onChange={handleChange}
        data-color-mode={colorMode}
        visibleDragbar={false}
        textareaProps={{
          placeholder: "Write your note here...",
          "aria-label": "Markdown editor content",
          style: {
            fontSize: 14,
            lineHeight: 1.5,
            fontFamily: "inherit",
          },
        }}
        preview="edit"
        height={600}
        previewOptions={{
          rehypePlugins: [rehypeSanitize],
        }}
      />
    </div>
  );
}
