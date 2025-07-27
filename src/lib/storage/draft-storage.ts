import { type DBSchema, openDB } from "idb";

/** DraftData mirrors the structure used in DraftManager */
export interface DraftData {
	content: string;
	timestamp: number;
	sessionId: string;
	expiresAt: number;
}

interface DraftDb extends DBSchema {
	drafts: {
		key: string; // draftKey
		value: DraftData;
		indexes: {
			"by-session": string;
			"by-expires": number;
		};
	};
}

const DB_NAME = "studyloop-drafts";
const STORE_NAME = "drafts";
const DB_VERSION = 2;

/**
 * Detect IndexedDB support (Edge runtime/server & Safari private mode may disable it)
 */
export const supportsIndexedDB =
	typeof window !== "undefined" && typeof indexedDB !== "undefined";

const dbPromise = supportsIndexedDB
	? openDB<DraftDb>(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion, _newVersion, transaction) {
				if (oldVersion < 1) {
					const store = db.createObjectStore(STORE_NAME);
					store.createIndex("by-session", "sessionId");
				}
				if (oldVersion < 2) {
					// Access store through the upgrade transaction
					const store = transaction.objectStore(STORE_NAME);
					store.createIndex("by-expires", "expiresAt");
				}
			},
		})
	: null;

const LS_PREFIX = "draft-"; // fallback key prefix for localStorage

/** Error handling wrapper for database operations */
async function withRetry<T>(
	operation: () => Promise<T>,
	maxRetries = 3,
	delay = 100
): Promise<T> {
	let lastError: Error | undefined;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error as Error;
			if (attempt < maxRetries) {
				await new Promise((resolve) =>
					setTimeout(resolve, delay * 2 ** attempt)
				);
			}
		}
	}

	if (lastError) {
		throw lastError;
	}
	throw new Error("Operation failed after retries");
}

/** IndexedDB or localStorage – get single draft */
export async function getDraft(key: string): Promise<DraftData | undefined> {
	return withRetry(async () => {
		if (supportsIndexedDB && dbPromise) {
			const db = await dbPromise;
			const draft = await db.get(STORE_NAME, key);
			if (draft !== undefined) return draft;
		}

		if (typeof localStorage === "undefined") return undefined;
		const raw = localStorage.getItem(LS_PREFIX + key);
		return raw ? (JSON.parse(raw) as DraftData) : undefined;
	});
}

/** Bulk upsert drafts in a single transaction */
export async function bulkUpsertDrafts(
	drafts: Array<[string, DraftData]>
): Promise<void> {
	return withRetry(async () => {
		if (supportsIndexedDB && dbPromise) {
			const db = await dbPromise;
			const tx = db.transaction(STORE_NAME, "readwrite");

			await Promise.all([
				...drafts.map(([key, value]) => tx.store.put(value, key)),
				tx.done,
			]);
			return;
		}

		if (typeof localStorage === "undefined") return;

		// Fallback to localStorage for bulk operations
		for (const [key, value] of drafts) {
			localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
		}
	});
}

export async function setDraft(key: string, value: DraftData): Promise<void> {
	return bulkUpsertDrafts([[key, value]]);
}

/** Bulk delete drafts by keys */
export async function bulkDeleteDrafts(keys: string[]): Promise<void> {
	return withRetry(async () => {
		if (supportsIndexedDB && dbPromise) {
			const db = await dbPromise;
			const tx = db.transaction(STORE_NAME, "readwrite");

			await Promise.all([...keys.map((key) => tx.store.delete(key)), tx.done]);
			return;
		}

		if (typeof localStorage === "undefined") return;

		for (const key of keys) {
			localStorage.removeItem(LS_PREFIX + key);
		}
	});
}

export async function deleteDraft(key: string): Promise<void> {
	return bulkDeleteDrafts([key]);
}

/** Get drafts with pagination and filtering */
export async function getDraftsWithPagination(
	offset = 0,
	limit = 50,
	sessionId?: string
): Promise<Array<[string, DraftData]>> {
	return withRetry(async () => {
		if (supportsIndexedDB && dbPromise) {
			const db = await dbPromise;
			const tx = db.transaction(STORE_NAME);

			if (sessionId) {
				const index = tx.store.index("by-session");
				const results: Array<[string, DraftData]> = [];
				let count = 0;
				let skipped = 0;

				for await (const cursor of index.iterate(sessionId)) {
					if (skipped < offset) {
						skipped++;
						continue;
					}
					if (count >= limit) break;

					results.push([cursor.primaryKey as string, cursor.value]);
					count++;
				}

				return results;
			}

			const keys = await tx.store.getAllKeys();
			const values = await tx.store.getAll();

			return keys
				.slice(offset, offset + limit)
				.map((k, i) => [k as string, values[offset + i] as DraftData]);
		}

		if (typeof localStorage === "undefined") return [];

		const entries: Array<[string, DraftData]> = [];
		let count = 0;
		let skipped = 0;

		for (const i of Array.from({ length: localStorage.length }).keys()) {
			if (count >= limit) break;

			const k = localStorage.key(i);
			if (k?.startsWith(LS_PREFIX)) {
				const raw = localStorage.getItem(k);
				if (raw) {
					const parsed = JSON.parse(raw) as DraftData;

					// Filter by session if provided
					if (sessionId && parsed.sessionId !== sessionId) continue;

					if (skipped < offset) {
						skipped++;
						continue;
					}

					entries.push([k.replace(LS_PREFIX, ""), parsed]);
					count++;
				}
			}
		}

		return entries;
	});
}

/** Return all draft [key, value] pairs */
export async function getAllDraftEntries(): Promise<
	Array<[string, DraftData]>
> {
	return getDraftsWithPagination(0, Number.MAX_SAFE_INTEGER);
}

/** Clean up expired drafts and return count cleaned */
export async function cleanupExpiredDrafts(): Promise<number> {
	return withRetry(async () => {
		const now = Date.now();
		let cleanedCount = 0;

		if (supportsIndexedDB && dbPromise) {
			const db = await dbPromise;
			const tx = db.transaction(STORE_NAME, "readwrite");
			const index = tx.store.index("by-expires");

			// Get all drafts that have expired
			const expiredKeys: string[] = [];
			for await (const cursor of index.iterate(IDBKeyRange.upperBound(now))) {
				expiredKeys.push(cursor.primaryKey as string);
			}

			// Delete expired drafts in bulk
			await Promise.all([
				...expiredKeys.map((key) => tx.store.delete(key)),
				tx.done,
			]);

			cleanedCount = expiredKeys.length;
		} else if (typeof localStorage !== "undefined") {
			const keysToDelete: string[] = [];

			for (const i of Array.from({ length: localStorage.length }).keys()) {
				const k = localStorage.key(i);
				if (k?.startsWith(LS_PREFIX)) {
					const raw = localStorage.getItem(k);
					if (raw) {
						const parsed = JSON.parse(raw) as DraftData;
						if (parsed.expiresAt <= now) {
							keysToDelete.push(k);
						}
					}
				}
			}

			for (const k of keysToDelete) {
				localStorage.removeItem(k);
			}

			cleanedCount = keysToDelete.length;
		}

		return cleanedCount;
	});
}

/** Delete all drafts in current session */
export async function deleteDraftsBySession(sessionId: string): Promise<void> {
	return withRetry(async () => {
		if (supportsIndexedDB && dbPromise) {
			const db = await dbPromise;
			const tx = db.transaction(STORE_NAME, "readwrite");
			const index = tx.store.index("by-session");

			const keysToDelete: string[] = [];
			for await (const cursor of index.iterate(sessionId)) {
				keysToDelete.push(cursor.primaryKey as string);
			}

			await Promise.all([
				...keysToDelete.map((key) => tx.store.delete(key)),
				tx.done,
			]);
			return;
		}

		if (typeof localStorage === "undefined") return;

		const keysToDelete: string[] = [];
		for (const i of Array.from({ length: localStorage.length }).keys()) {
			const k = localStorage.key(i);
			if (k?.startsWith(LS_PREFIX)) {
				const raw = localStorage.getItem(k);
				if (raw) {
					const parsed = JSON.parse(raw) as DraftData;
					if (parsed.sessionId === sessionId) {
						keysToDelete.push(k);
					}
				}
			}
		}

		for (const k of keysToDelete) {
			localStorage.removeItem(k);
		}
	});
}

/** Get storage statistics */
export async function getStorageStats(): Promise<{
	totalDrafts: number;
	expiredDrafts: number;
	storageSize: number;
	oldestDraft: number | null;
	newestDraft: number | null;
}> {
	return withRetry(async () => {
		const now = Date.now();
		let totalDrafts = 0;
		let expiredDrafts = 0;
		let storageSize = 0;
		let oldestDraft: number | null = null;
		let newestDraft: number | null = null;

		if (supportsIndexedDB && dbPromise) {
			const db = await dbPromise;
			const tx = db.transaction(STORE_NAME);
			const allValues = await tx.store.getAll();

			totalDrafts = allValues.length;

			for (const draft of allValues) {
				if (draft.expiresAt <= now) expiredDrafts++;
				storageSize += JSON.stringify(draft).length;

				if (oldestDraft === null || draft.timestamp < oldestDraft) {
					oldestDraft = draft.timestamp;
				}
				if (newestDraft === null || draft.timestamp > newestDraft) {
					newestDraft = draft.timestamp;
				}
			}
		} else if (typeof localStorage !== "undefined") {
			for (const i of Array.from({ length: localStorage.length }).keys()) {
				const k = localStorage.key(i);
				if (k?.startsWith(LS_PREFIX)) {
					const raw = localStorage.getItem(k);
					if (raw) {
						totalDrafts++;
						storageSize += raw.length + k.length;

						const parsed = JSON.parse(raw) as DraftData;
						if (parsed.expiresAt <= now) expiredDrafts++;

						if (oldestDraft === null || parsed.timestamp < oldestDraft) {
							oldestDraft = parsed.timestamp;
						}
						if (newestDraft === null || parsed.timestamp > newestDraft) {
							newestDraft = parsed.timestamp;
						}
					}
				}
			}
		}

		return {
			totalDrafts,
			expiredDrafts,
			storageSize,
			oldestDraft,
			newestDraft,
		};
	});
}
