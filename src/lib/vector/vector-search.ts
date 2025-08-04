import { logger } from "@/lib/utils/logger";
import { and, cosineDistance, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { courseMaterials, documentChunks } from "../../db/schema";
import { generateEmbeddings } from "../ai/embeddings";
import { VectorSearchError } from "../ai/errors";
import { processAIError } from "../ai/quota-handler";

interface SearchOptions {
	limit?: number; // Default: 10
	threshold?: number; // Similarity threshold (0-1)
	materialIds?: string[]; // Filter by specific materials
	includeMetadata?: boolean; // Include chunk metadata
	useHybridSearch?: boolean; // Enable hybrid search (vector + text)
	textWeight?: number; // Weight for text search (0-1, default: 0.3)
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
 * Preprocess and normalize search queries for better results
 */
function preprocessQuery(query: string): string {
	return query
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ") // Normalize whitespace
		.replace(/[^\w\s-]/g, "") // Remove special characters except hyphens
		.slice(0, 200); // Limit query length for embedding performance
}

/**
 * Prepare query for PostgreSQL full text search
 */
function prepareTextSearchQuery(query: string): string {
	// Split into tokens and join with & for AND search
	const tokens = preprocessQuery(query)
		.split(" ")
		.filter((token) => token.length > 2) // Ignore very short words
		.map((token) => `${token}:*`) // Add prefix matching
		.join(" & ");

	return tokens || query; // Fallback to original if no valid tokens
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
		useHybridSearch = false,
		textWeight = 0.3,
	} = options;

	try {
		// Preprocess the query for better results
		const processedQuery = preprocessQuery(query);

		// Generate embedding for the preprocessed query
		const embeddingResult = await generateEmbeddings([processedQuery]);

		if (!embeddingResult.success || !embeddingResult.embeddings) {
			throw new VectorSearchError(
				"Failed to generate query embedding",
				processedQuery,
				useHybridSearch ? "hybrid" : "vector",
				{ originalQuery: query }
			);
		}

		const queryEmbedding = embeddingResult.embeddings[0];

		// Build the search query using cosine similarity with Drizzle helper
		const similarity = sql<number>`1 - ${cosineDistance(documentChunks.embedding, queryEmbedding)}`;

		let results: Array<{
			id: string;
			content: string;
			similarity: number;
			materialId: string;
			chunkIndex: number;
			metadata: unknown;
			materialTitle: string | null;
		}>;

		if (useHybridSearch) {
			// Hybrid search: combine vector similarity with text search
			const textSearchQuery = prepareTextSearchQuery(query);
			const vectorWeight = 1 - textWeight;

			// Calculate combined score
			const combinedScore = sql<number>`
				(${vectorWeight} * (1 - ${cosineDistance(documentChunks.embedding, queryEmbedding)})) +
				(${textWeight} * 
					CASE 
						WHEN to_tsvector('english', ${documentChunks.content}) @@ to_tsquery('english', ${textSearchQuery})
						THEN ts_rank(to_tsvector('english', ${documentChunks.content}), to_tsquery('english', ${textSearchQuery}))
						ELSE 0
					END
				)
			`;

			results = await db
				.select({
					id: documentChunks.id,
					content: documentChunks.content,
					similarity: combinedScore,
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
						sql`${combinedScore} > ${threshold}`,
						materialIds
							? sql`${documentChunks.materialId} = ANY(${materialIds})`
							: undefined
					)
				)
				.orderBy(desc(combinedScore))
				.limit(limit);
		} else {
			// Pure vector search
			results = await db
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
		}

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
		// Handle quota exhaustion specifically
		const { isQuotaIssue, notification } = processAIError(error);

		if (isQuotaIssue && notification) {
			logger.error("Vector search failed due to quota exhaustion", {
				userMessage: notification.userMessage,
				technicalMessage: notification.technicalMessage,
				provider: notification.provider,
				query,
				options,
			});

			return {
				success: false,
				error: notification.userMessage,
			};
		}

		logger.error("Vector search failed", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			query,
			options,
		});
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
		logger.error("Similar chunks search failed", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			chunkId,
			options,
		});
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
		logger.error("Failed to get chunks for material", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			materialId,
			options,
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
