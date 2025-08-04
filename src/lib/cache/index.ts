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
} as const;

// Generic cache get
export const cacheGet = async <T>(
	key: string,
	_cacheType: keyof typeof CACHE_TTL
): Promise<T | null> => {
	try {
		const value = await redis.get<T>(key);
		return value;
	} catch (error) {
		console.error("Cache get error:", error);
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
	} catch (error) {
		console.error("Cache set error:", error);
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
	} catch (error) {
		console.error("Cache invalidation failed:", error);
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
	} catch (error) {
		console.error("Cache mget error:", error);
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
	} catch (error) {
		console.error("Cache mset error:", error);
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
