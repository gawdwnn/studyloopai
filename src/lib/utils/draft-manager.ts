/**
 * Efficient Draft Management System
 *
 * Features:
 * - Session-based draft keys with automatic cleanup
 * - LRU cache for memory efficiency
 * - Bulk operations for better performance
 * - IndexedDB-first with transparent localStorage fallback
 * - Automatic stale draft cleanup
 */

import {
	type DraftData,
	bulkDeleteDrafts,
	bulkUpsertDrafts,
	cleanupExpiredDrafts,
	deleteDraftsBySession,
	getDraft as getPersistedDraft,
	getStorageStats,
} from "@/lib/storage/draft-storage";

/** LRU Cache node for memory management */
interface CacheNode {
	key: string;
	data: DraftData;
	prev?: CacheNode;
	next?: CacheNode;
}

/** LRU Cache implementation for draft data */
class LRUCache {
	private maxSize: number;
	private size = 0;
	private head?: CacheNode;
	private tail?: CacheNode;
	private cache = new Map<string, CacheNode>();

	constructor(maxSize = 100) {
		this.maxSize = maxSize;
	}

	get(key: string): DraftData | undefined {
		const node = this.cache.get(key);
		if (!node) return undefined;

		// Move to front (most recently used)
		this.moveToFront(node);
		return node.data;
	}

	set(key: string, data: DraftData): void {
		const existingNode = this.cache.get(key);

		if (existingNode) {
			existingNode.data = data;
			this.moveToFront(existingNode);
			return;
		}

		const newNode: CacheNode = { key, data };

		if (this.size >= this.maxSize) {
			this.evictLRU();
		}

		this.addToFront(newNode);
		this.cache.set(key, newNode);
		this.size++;
	}

	delete(key: string): boolean {
		const node = this.cache.get(key);
		if (!node) return false;

		this.removeNode(node);
		this.cache.delete(key);
		this.size--;
		return true;
	}

	clear(): void {
		this.cache.clear();
		this.head = undefined;
		this.tail = undefined;
		this.size = 0;
	}

	keys(): string[] {
		return Array.from(this.cache.keys());
	}

	private moveToFront(node: CacheNode): void {
		this.removeNode(node);
		this.addToFront(node);
	}

	private addToFront(node: CacheNode): void {
		node.prev = undefined;
		node.next = this.head;

		if (this.head) {
			this.head.prev = node;
		}
		this.head = node;

		if (!this.tail) {
			this.tail = node;
		}
	}

	private removeNode(node: CacheNode): void {
		if (node.prev) {
			node.prev.next = node.next;
		} else {
			this.head = node.next;
		}

		if (node.next) {
			node.next.prev = node.prev;
		} else {
			this.tail = node.prev;
		}
	}

	private evictLRU(): void {
		if (!this.tail) return;

		this.cache.delete(this.tail.key);
		this.removeNode(this.tail);
		this.size--;
	}
}

const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const BATCH_SIZE = 10; // Number of operations to batch together
const CACHE_SIZE = 50; // Maximum number of drafts to keep in memory

// In-memory cache for frequently accessed drafts
const cache = new LRUCache(CACHE_SIZE);

// Batch operations queue
const pendingUpserts = new Map<string, DraftData>();
const pendingDeletes = new Set<string>();
let batchTimeout: NodeJS.Timeout | null = null;

let sessionId: string;

function generateSessionId(): string {
	// Try to get existing session ID from sessionStorage first
	if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
		const existingSessionId = sessionStorage.getItem("studyloop-session-id");
		if (existingSessionId) {
			return existingSessionId;
		}
	}
	
	// Generate new session ID if none exists
	const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	
	// Store it in sessionStorage for persistence across page reloads
	if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
		sessionStorage.setItem("studyloop-session-id", newSessionId);
	}
	
	return newSessionId;
}

/** Flush pending operations to storage */
async function flushBatch(): Promise<void> {
	if (batchTimeout) {
		clearTimeout(batchTimeout);
		batchTimeout = null;
	}

	try {
		// Process deletes first
		if (pendingDeletes.size > 0) {
			await bulkDeleteDrafts(Array.from(pendingDeletes));
			for (const key of pendingDeletes) {
				cache.delete(key);
			}
			pendingDeletes.clear();
		}

		// Process upserts
		if (pendingUpserts.size > 0) {
			const upserts = Array.from(pendingUpserts.entries());
			await bulkUpsertDrafts(upserts);

			// Update cache
			for (const [key, data] of upserts) {
				cache.set(key, data);
			}
			pendingUpserts.clear();
		}
	} catch (error) {
		console.warn("Failed to flush batch operations:", error);
	}
}

/** Schedule a batch flush */
function scheduleBatchFlush(): void {
	if (batchTimeout) return;

	batchTimeout = setTimeout(() => {
		void flushBatch();
	}, 100); // Small delay to batch operations
}

/** Load recent drafts into cache */
async function loadRecentDrafts(): Promise<void> {
	try {
		if (typeof window === "undefined") return;

		// Run cleanup first
		await cleanupExpiredDrafts();

		// Note: We don't load all drafts into memory anymore
		// Cache will be populated on-demand as drafts are accessed
	} catch (error) {
		console.warn("Failed to load recent drafts:", error);
	}
}

/**
 * Create or get existing draft context
 */
function createDraft(context: string, initialContent = ""): string {
	// Use context directly as key for persistence across sessions
	const draftKey = context;
	
	// Always ensure draft exists in cache for consistent behavior
	// This allows both new and existing drafts to work properly
	if (!cache.get(draftKey)) {
		const draft: DraftData = {
			content: initialContent,
			timestamp: Date.now(),
			sessionId: sessionId,
			expiresAt: Date.now() + DRAFT_EXPIRY_MS,
		};

		// Add to cache immediately for optimistic updates
		cache.set(draftKey, draft);
		
		// Add to pending upserts for batch processing
		pendingUpserts.set(draftKey, draft);
		scheduleBatchFlush();
	}

	return draftKey;
}

/**
 * Update draft content with optimistic caching
 */
function updateDraft(draftKey: string, content: string): void {
	// Get current draft from cache or create new one
	let draft = cache.get(draftKey);

	if (draft) {
		// Update existing draft
		draft = {
			...draft,
			content,
			timestamp: Date.now(),
		};
	} else {
		// If not in cache, create new draft entry
		draft = {
			content,
			timestamp: Date.now(),
			sessionId: sessionId,
			expiresAt: Date.now() + DRAFT_EXPIRY_MS,
		};
	}

	// Update cache immediately (optimistic)
	cache.set(draftKey, draft);

	// Schedule for batch persistence
	pendingUpserts.set(draftKey, draft);
	scheduleBatchFlush();
}

/**
 * Get draft content with intelligent caching
 */
async function getDraft(draftKey: string): Promise<string | null> {
	// Check cache first
	let draft = cache.get(draftKey);

	if (!draft) {
		// Load from storage if not in cache
		draft = await getPersistedDraft(draftKey);
		if (draft) {
			cache.set(draftKey, draft);
		}
	}

	if (!draft) return null;

	// Check if expired
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
	// Remove from cache immediately
	cache.delete(draftKey);

	// Remove from pending upserts if present
	pendingUpserts.delete(draftKey);

	// Add to pending deletes
	pendingDeletes.add(draftKey);
	scheduleBatchFlush();
}

/**
 * Clear all drafts for current session
 */
async function clearSessionDrafts(): Promise<void> {
	try {
		await deleteDraftsBySession(sessionId);

		// Clear from cache
		const cacheKeys = cache.keys();
		for (const key of cacheKeys) {
			const draft = cache.get(key);
			if (draft?.sessionId === sessionId) {
				cache.delete(key);
			}
		}

		// Clear pending operations for this session
		for (const [key, draft] of pendingUpserts.entries()) {
			if (draft.sessionId === sessionId) {
				pendingUpserts.delete(key);
			}
		}
	} catch (error) {
		console.warn("Failed to clear session drafts:", error);
	}
}

/**
 * Get draft metadata
 */
async function getDraftMetadata(
	draftKey: string
): Promise<{ timestamp: number; expiresAt: number } | null> {
	// Check cache first
	let draft = cache.get(draftKey);

	if (!draft) {
		// Load from storage if not in cache
		draft = await getPersistedDraft(draftKey);
	}

	return draft ? { timestamp: draft.timestamp, expiresAt: draft.expiresAt } : null;
}

/**
 * Check if draft exists and is valid
 */
async function hasDraft(draftKey: string): Promise<boolean> {
	const metadata = await getDraftMetadata(draftKey);
	return metadata ? metadata.expiresAt > Date.now() : false;
}

/**
 * Get comprehensive stats about drafts
 */
async function getStats(): Promise<{
	total: number;
	forSession: number;
	expired: number;
	cacheSize: number;
	storageStats: Awaited<ReturnType<typeof getStorageStats>>;
}> {
	const storageStats = await getStorageStats();
	const cacheKeys = cache.keys();

	let forSession = 0;
	for (const key of cacheKeys) {
		const draft = cache.get(key);
		if (draft?.sessionId === sessionId) {
			forSession++;
		}
	}

	return {
		total: storageStats.totalDrafts,
		forSession,
		expired: storageStats.expiredDrafts,
		cacheSize: cacheKeys.length,
		storageStats,
	};
}

// Initialization logic
function initialize() {
	// Session ID should be generated regardless of the environment.
	if (!sessionId) {
		sessionId = generateSessionId();
	}

	// Browser-specific logic
	if (typeof window !== "undefined") {
		void loadRecentDrafts();

		// Flush any pending operations before unload
		window.addEventListener("beforeunload", () => {
			void flushBatch();
		});

		// Periodic cleanup of expired drafts
		setInterval(
			() => {
				void cleanupExpiredDrafts();
			},
			5 * 60 * 1000
		); // Every 5 minutes
	}
}

initialize();

const DraftManager = {
	createDraft,
	updateDraft,
	getDraft,
	deleteDraft,
	clearSessionDrafts,
	getDraftMetadata,
	hasDraft,
	getStats,
	flushBatch, // Expose for manual flushing if needed
};

export default DraftManager;
