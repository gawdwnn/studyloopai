import { createHash } from "node:crypto";
import { cacheMget, cacheMset } from "@/lib/cache";
import { logger } from "@/lib/utils/logger";
import { embed } from "ai";
import { getEmbeddingModel } from "./config";
import {
	EmbeddingError,
	QuotaExhaustedError,
	RateLimitError,
	getProviderFromError,
	getRetryDelay,
	isQuotaExhaustedError,
	isRateLimitError,
} from "./errors";

interface EmbeddingOptions {
	batchSize?: number;
	maxRetries?: number;
	retryDelay?: number;
}

interface EmbeddingResult {
	success: boolean;
	embeddings: number[][];
	error?: string;
}

/**
 * Generate embeddings for text chunks with cost optimization
 */
export async function generateEmbeddings(
	texts: string[],
	options: EmbeddingOptions = {}
): Promise<EmbeddingResult> {
	const { batchSize = 100, maxRetries = 3, retryDelay = 1000 } = options;

	try {
		const textHashes = texts.map((text) =>
			createHash("sha256").update(text).digest("hex")
		);

		// Get cached embeddings using direct Redis mget
		const cachedEmbeddingsMap = await cacheMget<number[]>(textHashes);
		const uncachedTexts: { text: string; hash: string; index: number }[] = [];

		texts.forEach((text, index) => {
			const hash = textHashes[index];
			if (!cachedEmbeddingsMap.has(hash)) {
				uncachedTexts.push({ text, hash, index });
			}
		});

		const newEmbeddingsMap = new Map<string, number[]>();

		if (uncachedTexts.length > 0) {
			const batches = createBatches(
				uncachedTexts.map((t) => t.text),
				batchSize
			);
			const newEmbeddings: number[][] = [];

			for (const batch of batches) {
				const batchResult = await processBatch(batch, maxRetries, retryDelay);
				if (!batchResult.success || !batchResult.embeddings) {
					// Check if it's a quota error to provide better error message
					const isQuotaError = batchResult.error?.includes("Quota exhausted");

					if (isQuotaError) {
						throw new QuotaExhaustedError(
							batchResult.error || "API quota exhausted",
							"openai", // Default to OpenAI for embeddings
							"text-embedding-3-small",
							true
						);
					}
					throw new EmbeddingError(
						`Batch processing failed: ${batchResult.error}`,
						"text-embedding-3-small",
						batch.length,
						{ batchIndex: batches.indexOf(batch) }
					);
				}
				newEmbeddings.push(...batchResult.embeddings);
			}

			newEmbeddings.forEach((embedding, i) => {
				const source = uncachedTexts[i];
				newEmbeddingsMap.set(source.hash, embedding);
			});

			// Cache new embeddings using Redis mset with pipeline
			await cacheMset(Array.from(newEmbeddingsMap.entries()), "embedding");
		}

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
			options,
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			embeddings: [],
		};
	}
}

/**
 * Process a single batch with retry logic using AI SDK
 */
async function processBatch(
	texts: string[],
	maxRetries: number,
	retryDelay: number
): Promise<{ success: boolean; embeddings?: number[][]; error?: string }> {
	// Try different models on failure
	const models = [
		"text-embedding-3-small",
		"text-embedding-ada-002", // Fallback to older model
	];

	for (const modelName of models) {
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const embeddings: number[][] = [];
				for (const text of texts) {
					const result = await embed({
						model: getEmbeddingModel(modelName),
						value: text,
					});
					embeddings.push(result.embedding);
				}

				return {
					success: true,
					embeddings,
				};
			} catch (error) {
				const isRateLimit = isRateLimitError(error);
				const isQuotaExhausted = isQuotaExhaustedError(error);
				const provider = getProviderFromError(error);

				// Create appropriate error type
				let aiError: QuotaExhaustedError | RateLimitError | EmbeddingError;

				if (isQuotaExhausted) {
					aiError = new QuotaExhaustedError(
						error instanceof Error ? error.message : "API quota exhausted",
						provider === "unknown" ? "openai" : provider, // Default to OpenAI for embeddings
						modelName,
						true, // Requires billing action
						{ attempt, maxRetries }
					);
				} else if (isRateLimit) {
					aiError = new RateLimitError(
						error instanceof Error ? error.message : "Rate limit exceeded",
						getRetryDelay(error) || undefined,
						modelName,
						{ attempt, maxRetries }
					);
				} else {
					aiError = new EmbeddingError(
						error instanceof Error
							? error.message
							: "Embedding generation failed",
						modelName,
						texts.length,
						{ attempt, maxRetries }
					);
				}

				logger.error(
					`Batch attempt ${attempt} failed with model ${modelName}`,
					{
						error: aiError,
						attempt,
						maxRetries,
						textsCount: texts.length,
						model: modelName,
						isRateLimit,
					}
				);

				// If quota is exhausted, don't retry - fail immediately
				if (isQuotaExhausted) {
					return {
						success: false,
						error: `Quota exhausted for ${provider}: ${aiError.message}`,
					};
				}

				// If it's the last attempt with this model, try next model
				if (attempt === maxRetries) {
					if (modelName === models[models.length - 1]) {
						return {
							success: false,
							error: `All models failed: ${aiError.message}`,
						};
					}
					break; // Try next model
				}

				// Use custom retry delay if available, otherwise exponential backoff
				const customDelay = getRetryDelay(error);
				const delay =
					customDelay ||
					(isRateLimit
						? retryDelay * 2 ** attempt + Math.random() * 1000
						: retryDelay * attempt);

				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}
	return { success: false, error: "All models failed" };
}

/**
 * Create batches from texts array
 */
function createBatches(texts: string[], batchSize: number): string[][] {
	const batches: string[][] = [];
	for (let i = 0; i < texts.length; i += batchSize) {
		batches.push(texts.slice(i, i + batchSize));
	}
	return batches;
}
