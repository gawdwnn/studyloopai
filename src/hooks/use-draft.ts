/**
 * React Hook for Draft Management
 *
 * Provides a clean interface for managing drafts with automatic cleanup
 */

import DraftManager from "@/lib/utils/draft-manager";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseDraftOptions {
  context: string;
  initialContent?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
  onContentChange?: (content: string) => void;
}

interface UseDraftReturn {
  content: string;
  updateContent: (content: string) => void;
  clearDraft: () => void;
  hasDraft: boolean;
  lastSaved: Date | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
}

export function useDraft({
  context,
  initialContent = "",
  autoSave = true,
  autoSaveDelay = 1000,
  onContentChange,
}: UseDraftOptions): UseDraftReturn {
  const draftManager = DraftManager;
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [content, setContent] = useState(initialContent);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [hasDraft, setHasDraft] = useState(false);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize draft on mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      initialContentRef.current = initialContent;

      // Create a new draft context
      const newDraftKey = draftManager.createDraft(context, initialContent);
      setDraftKey(newDraftKey);

      // Only load existing draft content if we don't have initial content
      // This prevents loading stale drafts when editing existing notes
      if (!initialContent) {
        const existingContent = draftManager.getDraft(newDraftKey);
        if (existingContent?.trim()) {
          setContent(existingContent);
          setHasDraft(true);
          onContentChange?.(existingContent);
        }
      }

      setSaveStatus("saved");
    }
  }, [context, initialContent, draftManager, onContentChange]);

  // Track initialContent changes separately to avoid clearing user input
  const initialContentRef = useRef(initialContent);

  // Update content when initialContent changes (switching between notes)
  useEffect(() => {
    if (
      isInitializedRef.current &&
      initialContent !== initialContentRef.current
    ) {
      // Only update if initialContent actually changed, not user content
      initialContentRef.current = initialContent;
      setContent(initialContent);
      setHasDraft(false);
      setSaveStatus("saved");

      // Clear any existing draft when we have real content
      if (draftKey && initialContent) {
        draftManager.deleteDraft(draftKey);
      }
    }
  }, [initialContent, draftKey, draftManager]);

  // Auto-save functionality
  const saveDraft = useCallback(
    (contentToSave: string) => {
      if (!draftKey) return;

      setSaveStatus("saving");

      try {
        draftManager.updateDraft(draftKey, contentToSave);
        setLastSaved(new Date());
        setSaveStatus("saved");
        setHasDraft(contentToSave !== initialContent);
      } catch (error) {
        console.warn("Failed to save draft:", error);
        setSaveStatus("error");
      }
    },
    [draftKey, draftManager, initialContent]
  );

  const updateContent = useCallback(
    (newContent: string) => {
      setContent(newContent);
      onContentChange?.(newContent);

      if (autoSave) {
        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }

        // Set new timeout for auto-save
        autoSaveTimeoutRef.current = setTimeout(() => {
          saveDraft(newContent);
        }, autoSaveDelay);
      }
    },
    [autoSave, autoSaveDelay, saveDraft, onContentChange]
  );

  const clearDraft = useCallback(() => {
    if (draftKey) {
      draftManager.deleteDraft(draftKey);
      setHasDraft(false);
      setSaveStatus("idle");
      setLastSaved(null);
    }
  }, [draftKey, draftManager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Optionally clear draft on unmount if content is empty
      if (draftKey && !content.trim()) {
        draftManager.deleteDraft(draftKey);
      }
    };
  }, [draftKey, content, draftManager]);

  return {
    content,
    updateContent,
    clearDraft,
    hasDraft,
    lastSaved,
    saveStatus,
  };
}

/**
 * Utility hook for clearing drafts by context pattern
 */
export function useDraftCleanup() {
  const draftManager = DraftManager;

  const clearDraftsForContext = useCallback(
    (contextPattern: string) => {
      draftManager.clearDraftsForContext(contextPattern);
    },
    [draftManager]
  );

  const clearAllSessionDrafts = useCallback(() => {
    draftManager.clearSessionDrafts();
  }, [draftManager]);

  return {
    clearDraftsForContext,
    clearAllSessionDrafts,
  };
}
