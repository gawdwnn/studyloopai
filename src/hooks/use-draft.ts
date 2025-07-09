/**
 * Optimized React Hook for Draft Management
 *
 * Features:
 * - Async draft operations with the new manager
 * - Improved performance with reduced re-renders
 * - Better cleanup and error handling
 * - Conflict resolution for concurrent edits
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
	isLoading: boolean;
}

export function useDraft({
	context,
	initialContent = "",
	autoSave = true,
	autoSaveDelay = 1000,
	onContentChange,
}: UseDraftOptions): UseDraftReturn {
	const [draftKey, setDraftKey] = useState<string | null>(null);
	const [content, setContent] = useState(initialContent);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
	const [hasDraft, setHasDraft] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isInitializedRef = useRef(false);
	const initialContentRef = useRef(initialContent);
	const lastContentVersionRef = useRef(0);

	// Initialize draft on mount with async operations
	useEffect(() => {
		if (isInitializedRef.current) return;

		isInitializedRef.current = true;
		initialContentRef.current = initialContent;

		const initializeDraft = async () => {
			try {
				setIsLoading(true);

				// Create draft context (synchronous now)
				const newDraftKey = DraftManager.createDraft(context, initialContent);
				setDraftKey(newDraftKey);

				// Always try to load existing draft content from storage
				// This allows loading drafts across dialog opens for both new and existing notes
				const existingContent = await DraftManager.getDraft(newDraftKey);
				if (existingContent?.trim() && existingContent !== initialContent) {
					setContent(existingContent);
					setHasDraft(true);
					onContentChange?.(existingContent);
				}

				setSaveStatus("saved");
			} catch (error) {
				console.warn("Failed to initialize draft:", error);
				setSaveStatus("error");
			} finally {
				setIsLoading(false);
			}
		};

		void initializeDraft();
	}, [context, initialContent, onContentChange]);

	// Update content when initialContent changes (switching between notes)
	useEffect(() => {
		if (!isInitializedRef.current || initialContent === initialContentRef.current) {
			return;
		}

		// Update refs
		initialContentRef.current = initialContent;
		lastContentVersionRef.current++;

		// Update state
		setContent(initialContent);
		setHasDraft(false);
		setSaveStatus("saved");

		// Clear any existing draft when we have real content
		if (draftKey && initialContent) {
			DraftManager.deleteDraft(draftKey);
		}
	}, [initialContent, draftKey]);

	// Optimized auto-save functionality with conflict resolution
	const saveDraft = useCallback(
		async (contentToSave: string, version: number) => {
			if (!draftKey) return;

			// Check if this save is still relevant (no newer content)
			if (version < lastContentVersionRef.current) {
				return;
			}

			setSaveStatus("saving");

			try {
				DraftManager.updateDraft(draftKey, contentToSave);
				setLastSaved(new Date());
				setSaveStatus("saved");
				setHasDraft(contentToSave !== initialContent);
			} catch (error) {
				console.warn("Failed to save draft:", error);
				setSaveStatus("error");
			}
		},
		[draftKey, initialContent]
	);

	const updateContent = useCallback(
		(newContent: string) => {
			// Increment version for conflict resolution
			const currentVersion = ++lastContentVersionRef.current;

			setContent(newContent);
			onContentChange?.(newContent);

			if (autoSave) {
				// Clear existing timeout
				if (autoSaveTimeoutRef.current) {
					clearTimeout(autoSaveTimeoutRef.current);
				}

				// Set new timeout for auto-save with version tracking
				autoSaveTimeoutRef.current = setTimeout(() => {
					void saveDraft(newContent, currentVersion);
				}, autoSaveDelay);
			}
		},
		[autoSave, autoSaveDelay, saveDraft, onContentChange]
	);

	const clearDraft = useCallback(() => {
		if (draftKey) {
			DraftManager.deleteDraft(draftKey);
			setHasDraft(false);
			setSaveStatus("idle");
			setLastSaved(null);
		}
	}, [draftKey]);

	// Enhanced cleanup on unmount
	useEffect(() => {
		return () => {
			// Clear any pending auto-save
			if (autoSaveTimeoutRef.current) {
				clearTimeout(autoSaveTimeoutRef.current);
			}

			// Force flush any pending operations
			void DraftManager.flushBatch();

			// Optionally clear draft on unmount if content is empty
			if (draftKey && !content.trim()) {
				DraftManager.deleteDraft(draftKey);
			}
		};
	}, [draftKey, content]);

	return {
		content,
		updateContent,
		clearDraft,
		hasDraft,
		lastSaved,
		saveStatus,
		isLoading,
	};
}

/**
 * Enhanced utility hook for draft management operations
 */
export function useDraftCleanup() {
	const clearAllSessionDrafts = useCallback(async () => {
		try {
			await DraftManager.clearSessionDrafts();
		} catch (error) {
			console.warn("Failed to clear session drafts:", error);
		}
	}, []);

	const getDraftStats = useCallback(async () => {
		try {
			return await DraftManager.getStats();
		} catch (error) {
			console.warn("Failed to get draft stats:", error);
			return null;
		}
	}, []);

	const flushDrafts = useCallback(async () => {
		try {
			await DraftManager.flushBatch();
		} catch (error) {
			console.warn("Failed to flush drafts:", error);
		}
	}, []);

	return {
		clearAllSessionDrafts,
		getDraftStats,
		flushDrafts,
	};
}
