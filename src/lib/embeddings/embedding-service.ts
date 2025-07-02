import { createHash } from "node:crypto";
import { EmbeddingCache } from "@/lib/cache/redis-cache";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

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

const MODEL = "text-embedding-3-small";
const embeddingCache = new EmbeddingCache();

/**
 * Generate embeddings for text chunks with cost optimization
 */
export async function generateEmbeddings(
	texts: string[],
	options: EmbeddingOptions = {}
): Promise<EmbeddingResult> {
	const { batchSize = 100, maxRetries = 3, retryDelay = 1000 } = options;

	try {
		const textHashes = texts.map((text) => createHash("sha256").update(text).digest("hex"));

		const cachedEmbeddingsMap = await embeddingCache.getBatchEmbeddings(textHashes);
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
					return {
						success: false,
						error: `Batch failed: ${batchResult.error}`,
						embeddings: [],
					};
				}
				newEmbeddings.push(...batchResult.embeddings);
			}

			newEmbeddings.forEach((embedding, i) => {
				const source = uncachedTexts[i];
				newEmbeddingsMap.set(source.hash, embedding);
			});

			await embeddingCache.setBatchEmbeddings(newEmbeddingsMap);
		}

		const finalEmbeddings: number[][] = textHashes.map((hash) => {
			const embedding = cachedEmbeddingsMap.get(hash) || newEmbeddingsMap.get(hash);
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
		console.error("Embedding generation failed:", error);
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
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const embeddings: number[][] = [];
			for (const text of texts) {
				const result = await embed({
					model: openai.embedding(MODEL),
					value: text,
				});
				embeddings.push(result.embedding);
			}

			return {
				success: true,
				embeddings,
			};
		} catch (error) {
			console.error(`Batch attempt ${attempt} failed:`, error);
			if (attempt === maxRetries) {
				return { success: false, error: "Max retries exceeded" };
			}
			await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
		}
	}
	return { success: false, error: "Max retries exceeded" };
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
