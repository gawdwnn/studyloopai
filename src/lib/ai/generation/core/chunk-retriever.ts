/**
 * Chunk retrieval service with cache-first strategy
 */

import { getCachedChunks } from "@/lib/cache";
import { getCombinedChunks } from "@/lib/services/background-job-db-service";
import { createLogger } from "@/lib/utils/logger";
import type { ChunkRetrievalRequest, ContentChunks } from "../types";
import { combineChunksForGeneration } from "../utils";

const logger = createLogger("ai:generation:chunk-retriever");

/**
 * Retrieve chunks with cache-first strategy
 */
export async function retrieveChunks(
	request: ChunkRetrievalRequest
): Promise<ContentChunks> {
	const { materialIds, cacheKey, courseId, weekId, contentType } = request;

	let chunks: string[] = [];
	let cacheHit = false;

	// Try cache first if cacheKey is provided
	if (cacheKey) {
		const cachedChunks = await getCachedChunks(cacheKey);
		if (cachedChunks) {
			chunks = cachedChunks;
			cacheHit = true;
			logger.info("Cache hit for chunks", {
				cacheKey,
				chunkCount: chunks.length,
				contentType,
				courseId,
				weekId,
			});
		}
	}

	// Fallback to database if no cache hit
	if (chunks.length === 0) {
		chunks = await getCombinedChunks(materialIds);
		logger.info(
			cacheKey ? "Cache miss, fetched from DB" : "Fetched directly from DB",
			{
				cacheKey: cacheKey || "none",
				chunkCount: chunks.length,
				contentType,
				courseId,
				weekId,
			}
		);

		// Validate chunks exist
		if (chunks.length === 0) {
			throw new Error(`No content chunks found for ${contentType}`);
		}
	}

	// Combine chunks into generation-ready content
	const content = combineChunksForGeneration(chunks);

	return {
		content,
		chunks,
		metadata: {
			cacheHit,
			chunkCount: chunks.length,
			source: cacheHit ? "cache" : "database",
		},
	};
}

/**
 * Validate chunk retrieval request
 */
export function validateChunkRequest(request: ChunkRetrievalRequest): void {
	if (!request.materialIds || request.materialIds.length === 0) {
		throw new Error("At least one material ID is required");
	}

	if (!request.courseId) {
		throw new Error("Course ID is required");
	}

	if (!request.weekId) {
		throw new Error("Week ID is required");
	}

	if (!request.contentType) {
		throw new Error("Content type is required");
	}
}
