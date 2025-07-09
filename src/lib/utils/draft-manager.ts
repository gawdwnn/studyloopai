/**
 * Robust Draft Management System (Module-based Singleton)
 *
 * Features:
 * - Session-based draft keys with automatic cleanup
 * - Draft registry for centralized management
 * - Explicit lifecycle control
 * - Memory + localStorage hybrid storage
 * - Automatic stale draft cleanup
 */

interface DraftData {
	content: string;
	timestamp: number;
	sessionId: string;
	expiresAt: number;
}

interface DraftRegistry {
	[key: string]: DraftData;
}

const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = "note-drafts-registry";
const registry: Map<string, DraftData> = new Map();
let sessionId: string;

function generateSessionId(): string {
	return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateDraftKey(context: string): string {
	if (!sessionId) {
		initialize();
	}
	return `${sessionId}_${context}_${Date.now()}`;
}

function loadFromStorage(): void {
	try {
		if (typeof window === "undefined") return;

		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const storedRegistry: DraftRegistry = JSON.parse(stored);
			const now = Date.now();
			for (const [key, draft] of Object.entries(storedRegistry)) {
				if (draft.expiresAt > now) {
					registry.set(key, draft);
				}
			}
		}
	} catch (error) {
		console.warn("Failed to load drafts from storage:", error);
	}
}

function saveToStorage(): void {
	try {
		if (typeof window === "undefined") return;

		const registryObj: DraftRegistry = {};
		for (const [key, draft] of registry.entries()) {
			registryObj[key] = draft;
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(registryObj));
	} catch (error) {
		console.warn("Failed to save drafts to storage:", error);
	}
}

function cleanupExpiredDrafts(): void {
	const now = Date.now();
	const expiredKeys: string[] = [];

	for (const [key, draft] of registry.entries()) {
		if (draft.expiresAt <= now) {
			expiredKeys.push(key);
		}
	}

	for (const key of expiredKeys) {
		registry.delete(key);
	}

	if (expiredKeys.length > 0) {
		saveToStorage();
	}
}

/**
 * Create a new draft context
 */
function createDraft(context: string, initialContent = ""): string {
	const draftKey = generateDraftKey(context);
	const draft: DraftData = {
		content: initialContent,
		timestamp: Date.now(),
		sessionId: sessionId,
		expiresAt: Date.now() + DRAFT_EXPIRY_MS,
	};
	registry.set(draftKey, draft);
	saveToStorage();
	return draftKey;
}

/**
 * Update draft content
 */
function updateDraft(draftKey: string, content: string): void {
	const draft = registry.get(draftKey);
	if (draft) {
		draft.content = content;
		draft.timestamp = Date.now();
		saveToStorage();
	}
}

/**
 * Get draft content
 */
function getDraft(draftKey: string): string | null {
	const draft = registry.get(draftKey);
	if (!draft) return null;

	if (draft.expiresAt <= Date.now()) {
		deleteDraft(draftKey);
		return null;
	}
	return draft.content;
}

/**
 * Delete specific draft
 */
function deleteDraft(draftKey: string): void {
	registry.delete(draftKey);
	saveToStorage();
}

/**
 * Clear all drafts for a specific context pattern
 */
function clearDraftsForContext(contextPattern: string): void {
	const keysToDelete: string[] = [];
	for (const key of registry.keys()) {
		if (key.includes(contextPattern)) {
			keysToDelete.push(key);
		}
	}
	for (const key of keysToDelete) {
		registry.delete(key);
	}
	saveToStorage();
}

/**
 * Clear all drafts for current session
 */
function clearSessionDrafts(): void {
	const keysToDelete: string[] = [];
	for (const [key, draft] of registry.entries()) {
		if (draft.sessionId === sessionId) {
			keysToDelete.push(key);
		}
	}
	for (const key of keysToDelete) {
		registry.delete(key);
	}
	saveToStorage();
}

/**
 * Get draft metadata
 */
function getDraftMetadata(draftKey: string): { timestamp: number; expiresAt: number } | null {
	const draft = registry.get(draftKey);
	return draft ? { timestamp: draft.timestamp, expiresAt: draft.expiresAt } : null;
}

/**
 * Check if draft exists and is valid
 */
function hasDraft(draftKey: string): boolean {
	const draft = registry.get(draftKey);
	return draft ? draft.expiresAt > Date.now() : false;
}

/**
 * Get stats about current drafts
 */
function getStats(): { total: number; forSession: number; expired: number } {
	const now = Date.now();
	let total = 0;
	let forSession = 0;
	let expired = 0;

	for (const draft of registry.values()) {
		total++;
		if (draft.sessionId === sessionId) forSession++;
		if (draft.expiresAt <= now) expired++;
	}
	return { total, forSession, expired };
}

// Initialization logic
function initialize() {
	// Session ID should be generated regardless of the environment.
	if (!sessionId) {
		sessionId = generateSessionId();
	}

	// Browser-specific logic
	if (typeof window !== "undefined") {
		loadFromStorage();
		cleanupExpiredDrafts();
		window.addEventListener("beforeunload", saveToStorage);
	}
}

initialize();

const DraftManager = {
	createDraft,
	updateDraft,
	getDraft,
	deleteDraft,
	clearDraftsForContext,
	clearSessionDrafts,
	getDraftMetadata,
	hasDraft,
	getStats,
};

export default DraftManager;
