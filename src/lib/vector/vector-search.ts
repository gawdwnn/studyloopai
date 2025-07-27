import { and, cosineDistance, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { courseMaterials, documentChunks } from "../../db/schema";
import { generateEmbeddings } from "../ai/embeddings";

interface SearchOptions {
	limit?: number; // Default: 10
	threshold?: number; // Similarity threshold (0-1)
	materialIds?: string[]; // Filter by specific materials
	includeMetadata?: boolean; // Include chunk metadata
}

interface SearchResult {
	id: string;
	content: string;
	similarity: number;
	materialId: string;
	chunkIndex: number;
	metadata?: Record<string, unknown>;
	materialTitle?: string;
}

interface VectorSearchResponse {
	success: boolean;
	results?: SearchResult[];
	totalResults?: number;
	searchTime?: number;
	error?: string;
}

/**
 * Perform semantic search across document chunks
 */
export async function searchSimilarChunks(
	query: string,
	options: SearchOptions = {}
): Promise<VectorSearchResponse> {
	const startTime = Date.now();
	const {
		limit = 10,
		threshold = 0.7,
		materialIds,
		includeMetadata = true,
	} = options;

	try {
		// Generate embedding for the query
		const embeddingResult = await generateEmbeddings([query]);

		if (!embeddingResult.success || !embeddingResult.embeddings) {
			return {
				success: false,
				error: "Failed to generate query embedding",
			};
		}

		const queryEmbedding = embeddingResult.embeddings[0];

		// Build the search query using cosine similarity with Drizzle helper
		const similarity = sql<number>`1 - ${cosineDistance(documentChunks.embedding, queryEmbedding)}`;

		const searchQuery = db
			.select({
				id: documentChunks.id,
				content: documentChunks.content,
				similarity,
				materialId: documentChunks.materialId,
				chunkIndex: documentChunks.chunkIndex,
				metadata: includeMetadata ? documentChunks.metadata : sql`NULL`,
				materialTitle: courseMaterials.title,
			})
			.from(documentChunks)
			.leftJoin(
				courseMaterials,
				eq(documentChunks.materialId, courseMaterials.id)
			)
			.where(
				and(
					sql`1 - ${cosineDistance(documentChunks.embedding, queryEmbedding)} > ${threshold}`,
					materialIds
						? sql`${documentChunks.materialId} = ANY(${materialIds})`
						: undefined
				)
			)
			.orderBy(desc(similarity))
			.limit(limit);

		const results = await searchQuery;

		const searchTime = Date.now() - startTime;

		return {
			success: true,
			results: results.map((row) => ({
				id: row.id,
				content: row.content,
				similarity: row.similarity,
				materialId: row.materialId,
				chunkIndex: row.chunkIndex,
				metadata: row.metadata as Record<string, unknown> | undefined,
				materialTitle: row.materialTitle || undefined,
			})),
			totalResults: results.length,
			searchTime,
		};
	} catch (error) {
		console.error("Vector search failed:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get similar chunks to a given chunk (for related content)
 */
export async function findSimilarChunks(
	chunkId: string,
	options: Omit<SearchOptions, "materialIds"> = {}
): Promise<VectorSearchResponse> {
	const { limit = 5, threshold = 0.8 } = options;

	try {
		// Get the source chunk
		const sourceChunk = await db
			.select()
			.from(documentChunks)
			.where(eq(documentChunks.id, chunkId))
			.limit(1);

		if (sourceChunk.length === 0) {
			return {
				success: false,
				error: "Source chunk not found",
			};
		}

		const embedding = sourceChunk[0].embedding;
		if (!embedding) {
			return {
				success: false,
				error: "Source chunk has no embedding",
			};
		}

		// Find similar chunks (excluding the source chunk) using Drizzle helper
		const similarity = sql<number>`1 - ${cosineDistance(documentChunks.embedding, embedding)}`;

		const results = await db
			.select({
				id: documentChunks.id,
				content: documentChunks.content,
				similarity,
				materialId: documentChunks.materialId,
				chunkIndex: documentChunks.chunkIndex,
				metadata: documentChunks.metadata,
				materialTitle: courseMaterials.title,
			})
			.from(documentChunks)
			.leftJoin(
				courseMaterials,
				eq(documentChunks.materialId, courseMaterials.id)
			)
			.where(
				and(
					sql`${documentChunks.id} != ${chunkId}`,
					sql`1 - ${cosineDistance(documentChunks.embedding, embedding)} > ${threshold}`
				)
			)
			.orderBy(desc(similarity))
			.limit(limit);

		return {
			success: true,
			results: results.map((row) => ({
				id: row.id,
				content: row.content,
				similarity: row.similarity,
				materialId: row.materialId,
				chunkIndex: row.chunkIndex,
				metadata: row.metadata as Record<string, unknown> | undefined,
				materialTitle: row.materialTitle || undefined,
			})),
			totalResults: results.length,
		};
	} catch (error) {
		console.error("Similar chunks search failed:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get chunks for a specific material (for context building)
 */
export async function getChunksForMaterial(
	materialId: string,
	options: { limit?: number; offset?: number } = {}
): Promise<VectorSearchResponse> {
	const { limit = 50, offset = 0 } = options;

	try {
		const results = await db
			.select({
				id: documentChunks.id,
				content: documentChunks.content,
				similarity: sql<number>`1`, // No similarity calculation needed
				materialId: documentChunks.materialId,
				chunkIndex: documentChunks.chunkIndex,
				metadata: documentChunks.metadata,
			})
			.from(documentChunks)
			.where(eq(documentChunks.materialId, materialId))
			.orderBy(documentChunks.chunkIndex)
			.limit(limit)
			.offset(offset);

		return {
			success: true,
			results: results.map((row) => ({
				id: row.id,
				content: row.content,
				similarity: 1,
				materialId: row.materialId,
				chunkIndex: row.chunkIndex,
				metadata: row.metadata as Record<string, unknown> | undefined,
			})),
			totalResults: results.length,
		};
	} catch (error) {
		console.error("Failed to get chunks for material:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
