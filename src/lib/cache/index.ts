import { Redis } from "@upstash/redis";
import hashSum from "hash-sum";

// Redis client singleton - reuse the same instance
const redis = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL || "",
	token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Cache TTL configurations (in seconds)
const CACHE_TTL = {
	apiResponse: 900, // 15 minutes
	dbQuery: 300, // 5 minutes
	embedding: 86400, // 24 hours
	chunks: 3600, // 1 hour - for content generation chunks
	onboardingIncomplete: 300, // 5 minutes - for incomplete onboarding (may change frequently)
	onboardingComplete: 86400, // 24 hours - for completed onboarding (rarely changes)
	ocrResult: 604800, // 7 days - OCR results are expensive and stable
	ocrProcessing: 300, // 5 minutes - temporary cache during processing
} as const;

// Generic cache get
export const cacheGet = async <T>(
	key: string,
	_cacheType: keyof typeof CACHE_TTL
): Promise<T | null> => {
	try {
		const value = await redis.get<T>(key);
		return value;
	} catch (_error) {
		// Silent cache failure - return null to fallback to source
		return null;
	}
};

// Generic cache set with TTL
export const cacheSet = async <T>(
	key: string,
	value: T,
	cacheType: keyof typeof CACHE_TTL
): Promise<void> => {
	try {
		await redis.set(key, value, { ex: CACHE_TTL[cacheType] });
	} catch (_error) {
		// Silent cache failure - continue without caching
	}
};

// Cache-aside pattern helper
export const cacheAside = async <T>(
	key: string,
	cacheType: keyof typeof CACHE_TTL,
	generator: () => Promise<T>
): Promise<T> => {
	// Try cache first
	const cached = await cacheGet<T>(key, cacheType);
	if (cached !== null) {
		return cached;
	}

	// Cache miss - generate and store
	const value = await generator();
	await cacheSet(key, value, cacheType);
	return value;
};

// Pattern-based cache invalidation
export const cacheInvalidate = async (pattern: string): Promise<void> => {
	try {
		const keys = await redis.keys(pattern);
		if (keys.length > 0) {
			await redis.del(...keys);
		}
	} catch (_error) {
		// Silent cache failure - continue without invalidation
	}
};

// Batch operations for embeddings
export const cacheMget = async <T>(keys: string[]): Promise<Map<string, T>> => {
	try {
		const values = await redis.mget<T[]>(...keys);
		const result = new Map<string, T>();

		keys.forEach((key, index) => {
			if (values[index] !== null) {
				result.set(key, values[index]);
			}
		});

		return result;
	} catch (_error) {
		// Silent cache failure - return empty map to fallback
		return new Map();
	}
};

export const cacheMset = async <T>(
	entries: Array<[string, T]>,
	cacheType: keyof typeof CACHE_TTL
): Promise<void> => {
	try {
		// Upstash doesn't support mset with TTL, so we use pipeline
		const pipeline = redis.pipeline();

		for (const [key, value] of entries) {
			pipeline.set(key, value, { ex: CACHE_TTL[cacheType] });
		}

		await pipeline.exec();
	} catch (_error) {
		// Silent cache failure - continue without bulk caching
	}
};

// Chunk caching utilities
export const generateChunkCacheKey = (
	courseId: string,
	weekId: string,
	materialIds: string[]
): string => {
	// Sort materialIds for consistent key generation
	const sortedIds = [...materialIds].sort();
	const idsHash = hashSum(sortedIds.join(","));
	return `chunks:${courseId}:${weekId}:${idsHash}`;
};

// Chunk-specific cache operations
export const cacheChunks = async (
	chunks: string[],
	cacheKey: string
): Promise<void> => {
	await cacheSet(cacheKey, chunks, "chunks");
};

export const getCachedChunks = async (
	cacheKey: string
): Promise<string[] | null> => {
	return await cacheGet<string[]>(cacheKey, "chunks");
};

// OCR-specific cache utilities
export const generateOCRCacheKey = (
	fileHash: string,
	processingType: "mistral" | "basic"
): string => {
	// Global cache scope to maximize reuse across users
	return `ocr:${processingType}:${fileHash}`;
};

// OCR result caching
export const cacheOCRResult = async (
	result: string,
	cacheKey: string
): Promise<void> => {
	await cacheSet(cacheKey, result, "ocrResult");
};

export const getCachedOCRResult = async (
	cacheKey: string
): Promise<string | null> => {
	return await cacheGet<string>(cacheKey, "ocrResult");
};
