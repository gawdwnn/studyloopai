import { createHash } from "node:crypto";
import { cacheMget, cacheMset } from "@/lib/cache";
import { logger } from "@/lib/utils/logger";
import { embedMany } from "ai";
import { getEmbeddingModel } from "./config";
import {
	EmbeddingError,
	QuotaExhaustedError,
	RateLimitError,
	getProviderFromError,
	isQuotaExhaustedError,
	isRateLimitError,
} from "./errors";

interface EmbeddingResult {
	success: boolean;
	embeddings: number[][];
	error?: string;
}

/**
 * Generate embeddings for text chunks with cost optimization
 * Uses hybrid architecture: Redis caching + AI SDK parallel processing
 */
export async function generateEmbeddings(
	texts: string[]
): Promise<EmbeddingResult> {
	try {
		// Step 1: Generate SHA-256 hashes for cache keys (cost optimization)
		const textHashes = texts.map((text) =>
			createHash("sha256").update(text).digest("hex")
		);

		// Step 2: Check Redis cache for existing embeddings
		const cachedEmbeddingsMap = await cacheMget<number[]>(textHashes);
		const uncachedTexts: { text: string; hash: string; index: number }[] = [];

		// Step 3: Identify texts that need embedding generation
		texts.forEach((text, index) => {
			const hash = textHashes[index];
			if (!cachedEmbeddingsMap.has(hash)) {
				uncachedTexts.push({ text, hash, index });
			}
		});

		const newEmbeddingsMap = new Map<string, number[]>();

		// Step 4: Generate embeddings for uncached texts using AI SDK
		if (uncachedTexts.length > 0) {
			try {
				// Use AI SDK's embedMany - handles batching, retries, and error classification
				const { embeddings } = await embedMany({
					model: getEmbeddingModel("text-embedding-3-small"),
					values: uncachedTexts.map((t) => t.text),
					maxRetries: 3, // AI SDK handles retries automatically with exponential backoff
					abortSignal: AbortSignal.timeout(30000), // 30 second timeout for embeddings
				});

				// Map embeddings back to their hashes for caching
				embeddings.forEach((embedding, i) => {
					const source = uncachedTexts[i];
					newEmbeddingsMap.set(source.hash, embedding);
				});

				// Step 5: Cache new embeddings for future cost savings
				await cacheMset(Array.from(newEmbeddingsMap.entries()), "embedding");
			} catch (error) {
				// Leverage AI SDK's error classification while preserving logging
				const isRateLimit = isRateLimitError(error);
				const isQuotaExhausted = isQuotaExhaustedError(error);
				const provider = getProviderFromError(error);

				if (isQuotaExhausted) {
					throw new QuotaExhaustedError(
						error instanceof Error ? error.message : "API quota exhausted",
						provider === "unknown" ? "openai" : provider,
						"text-embedding-3-small",
						true
					);
				}

				if (isRateLimit) {
					throw new RateLimitError(
						error instanceof Error ? error.message : "Rate limit exceeded",
						undefined, // AI SDK handles retry delays
						"text-embedding-3-small"
					);
				}

				throw new EmbeddingError(
					error instanceof Error
						? error.message
						: "Embedding generation failed",
					"text-embedding-3-small",
					uncachedTexts.length
				);
			}
		}

		// Step 6: Combine cached and newly generated embeddings in original order
		const finalEmbeddings: number[][] = textHashes.map((hash) => {
			const embedding =
				cachedEmbeddingsMap.get(hash) || newEmbeddingsMap.get(hash);
			if (!embedding) {
				// This should theoretically never happen if logic is correct
				throw new Error(`Embedding not found for hash: ${hash}`);
			}
			return embedding;
		});

		return {
			success: true,
			embeddings: finalEmbeddings,
		};
	} catch (error) {
		logger.error("Embedding generation failed", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			textsCount: texts.length,
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			embeddings: [],
		};
	}
}
