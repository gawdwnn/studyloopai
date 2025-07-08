"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
import { Clock, Maximize2, Minimize2, Save } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import rehypeSanitize from "rehype-sanitize";
import screenfull from "screenfull";
import { useDebounceCallback, useLocalStorage } from "usehooks-ts";

interface MarkdownEditorProps {
  content: string;
  onSave: (content: string) => void;
  placeholder?: string;
  className?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
  readonly?: boolean;
  enableFullscreen?: boolean;
  enableDraftSave?: boolean;
  draftKey?: string;
  height?: number;
}

type Draft = {
  content: string;
  timestamp: string;
};

export function MarkdownEditor({
  content: initialContent,
  onSave,
  placeholder = "Start writing your notes...",
  className,
  autoSave = true,
  autoSaveDelay = 1000,
  readonly = false,
  enableFullscreen = true,
  enableDraftSave = true,
  draftKey = "markdown-draft",
  height = 600,
}: MarkdownEditorProps) {
  const [value, setValue] = useState(initialContent);
  const [lastSavedContent, setLastSavedContent] = useState(initialContent);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<
    "saved" | "saving" | "unsaved"
  >("saved");
  const [lastDraftSave, setLastDraftSave] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [draft, setDraft] = useLocalStorage<Draft | null>(
    `draft-${draftKey}`,
    null
  );

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

  // Load draft from localStorage on mount
  useEffect(() => {
    if (enableDraftSave && !initialContent && draft) {
      setValue(draft.content);
      setLastDraftSave(new Date(draft.timestamp));
      setDraftSaveStatus("saved");
    }
  }, [enableDraftSave, initialContent, draft]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (screenfull.isEnabled) {
        setIsFullscreen(screenfull.isFullscreen);
      }
    };

    if (screenfull.isEnabled) {
      screenfull.on("change", handleFullscreenChange);
      return () => screenfull.off("change", handleFullscreenChange);
    }
  }, []);

  // Debounced auto-save function
  const debouncedSave = useDebounceCallback((content: string) => {
    onSave(content);
    setLastSavedContent(content);
  }, autoSaveDelay);

  // Draft save function
  const saveDraft = useCallback(
    (content: string) => {
      if (enableDraftSave) {
        setDraftSaveStatus("saving");
        const newDraft: Draft = {
          content,
          timestamp: new Date().toISOString(),
        };
        setDraft(newDraft);
        setLastDraftSave(new Date());
        setDraftSaveStatus("saved");
      }
    },
    [enableDraftSave, setDraft]
  );

  // Debounced draft save
  const debouncedDraftSave = useDebounceCallback(saveDraft, 2000);

  // Fullscreen toggle function
  const toggleFullscreen = useCallback(() => {
    if (screenfull.isEnabled && containerRef.current) {
      screenfull.toggle(containerRef.current);
    }
  }, []);

  // Handle content change
  const handleChange = useCallback(
    (newValue?: string) => {
      const content = newValue || "";
      setValue(content);

      if (enableDraftSave) {
        setDraftSaveStatus("unsaved");
        debouncedDraftSave(content);
      }

      if (autoSave && !readonly) {
        debouncedSave(content);
      } else if (!readonly && !autoSave) {
        // In manual save mode, we only update the internal state
        // onSave is now only called from the manual save button
      } else if (!autoSave) {
        onSave(content);
      }
    },
    [
      autoSave,
      readonly,
      debouncedSave,
      enableDraftSave,
      debouncedDraftSave,
      onSave,
    ]
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
      <div
        className={cn("prose prose-sm max-w-none dark:prose-invert", className)}
      >
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
    <div
      ref={containerRef}
      className={cn(
        "w-full relative",
        isFullscreen && "fixed inset-0 z-50 bg-background",
        className
      )}
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-2 p-2 bg-muted/50 rounded-t-md border border-b-0">
        <div className="flex items-center gap-2">
          {enableDraftSave && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <Badge
                variant={draftSaveStatus === "saved" ? "secondary" : "outline"}
                className="text-xs"
              >
                {draftSaveStatus === "saving" && "Saving draft..."}
                {draftSaveStatus === "saved" &&
                  lastDraftSave &&
                  `Draft saved ${lastDraftSave.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                {draftSaveStatus === "unsaved" && "Unsaved changes"}
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

          {enableFullscreen && screenfull.isEnabled && (
            <Button size="sm" variant="outline" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
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
          style: {
            fontSize: 14,
            lineHeight: 1.5,
            fontFamily: "inherit",
          },
        }}
        preview="edit"
        height={isFullscreen ? window.innerHeight - 120 : height}
        previewOptions={{
          rehypePlugins: [rehypeSanitize],
        }}
      />
    </div>
  );
}
