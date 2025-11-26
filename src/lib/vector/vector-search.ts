import { logger } from "@/lib/utils/logger";
import { and, cosineDistance, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { courseMaterials, documentChunks } from "../../db/schema";
import { generateEmbeddings } from "../ai/embeddings";
import { VectorSearchError } from "../ai/errors";
import { isRateLimitError } from "../utils/error-handling";

interface VectorSearchOptions {
	limit?: number; // Default: 10
	threshold?: number; // Similarity threshold (0-1)
	materialIds?: string[]; // Filter by specific materials
	courseIds?: string[]; // Filter by specific courses
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

interface RawSearchResultRow {
	id: string;
	content: string;
	similarity: number;
	materialId: string;
	chunkIndex: number;
	metadata?: Record<string, unknown>;
	materialTitle?: string | null;
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
 * Perform semantic search across document chunks using vector embeddings
 */
export async function searchSimilarChunks(
	query: string,
	options: VectorSearchOptions = {}
): Promise<VectorSearchResponse> {
	const startTime = Date.now();
	const {
		limit = 10,
		threshold = 0.3, // Lower threshold for debugging - cosine similarity ranges 0-1
		materialIds,
		courseIds,
		includeMetadata = true,
	} = options;

	let queryEmbedding: number[] | undefined;

	try {
		// Step 1: Preprocess the query
		const processedQuery = preprocessQuery(query);

		// Step 2: Generate vector embedding for the query
		const embeddingResult = await generateEmbeddings([processedQuery]);

		if (!embeddingResult.success || !embeddingResult.embeddings) {
			throw new VectorSearchError(
				"Failed to generate query embedding",
				processedQuery,
				"vector",
				{ originalQuery: query }
			);
		}

		queryEmbedding = embeddingResult.embeddings[0];

		// Step 3: Build the query using Drizzle ORM's vector similarity functions
		const similarity = sql<number>`1 - (${cosineDistance(documentChunks.embedding, queryEmbedding)})`;

		// Build base query
		const baseQuery = db
			.select({
				id: documentChunks.id,
				content: documentChunks.content,
				similarity,
				materialId: documentChunks.materialId,
				chunkIndex: documentChunks.chunkIndex,
				metadata: includeMetadata ? documentChunks.metadata : sql<null>`NULL`,
				materialTitle: courseMaterials.title,
			})
			.from(documentChunks)
			.leftJoin(
				courseMaterials,
				eq(documentChunks.materialId, courseMaterials.id)
			);

		// Apply where conditions
		const whereConditions = [gt(similarity, threshold)];

		if (courseIds && courseIds.length > 0) {
			whereConditions.push(inArray(courseMaterials.courseId, courseIds));
		}

		if (materialIds && materialIds.length > 0) {
			whereConditions.push(inArray(documentChunks.materialId, materialIds));
		}

		const finalQuery = baseQuery
			.where(and(...whereConditions))
			.orderBy(desc(similarity))
			.limit(limit);

		logger.info(
			{
				query: processedQuery,
				courseIds,
				materialIds,
				threshold,
				embeddingLength: queryEmbedding.length,
			},
			"Executing vector search"
		);

		const rawResults = await finalQuery;

		// Debug: Log similarity scores and content validation
		logger.info(
			{
				resultCount: rawResults.length,
				similarities: rawResults.slice(0, 3).map((r) => r.similarity),
				threshold,
				hasResults: rawResults.length > 0,
				firstResult: rawResults[0]
					? {
							id: rawResults[0].id,
							similarity: rawResults[0].similarity,
							materialId: rawResults[0].materialId,
							contentPreview:
								typeof rawResults[0].content === "string"
									? rawResults[0].content.substring(0, 50)
									: `[INVALID CONTENT TYPE: ${typeof rawResults[0].content}]`,
							contentValid:
								typeof rawResults[0].content === "string" &&
								rawResults[0].content !== "[object Object]",
						}
					: null,
			},
			"Raw vector search results"
		);

		const searchTime = Date.now() - startTime;

		const results: SearchResult[] = rawResults.map(
			(row: RawSearchResultRow) => ({
				id: row.id,
				content: row.content,
				similarity: row.similarity,
				materialId: row.materialId,
				chunkIndex: row.chunkIndex,
				metadata: row.metadata as Record<string, unknown> | undefined,
				materialTitle: row.materialTitle || undefined,
			})
		);

		logger.info(
			{
				resultsFound: results.length,
				searchTime,
				topSimilarity: results[0]?.similarity,
				finalResultsAfterMapping: results.length,
				query: processedQuery,
			},
			"Vector search completed"
		);

		return {
			success: true,
			results,
			totalResults: results.length,
			searchTime,
		};
	} catch (error) {
		// Handle rate limit errors specifically
		if (isRateLimitError(error)) {
			logger.error(
				{
					remainingAttempts: error.remainingAttempts,
					resetTime: error.resetTime,
					query,
					limit: options.limit,
					threshold: options.threshold,
				},
				"Vector search failed due to rate limit"
			);

			return {
				success: false,
				error:
					"Search temporarily unavailable due to rate limits. Please try again later.",
			};
		}

		logger.error(
			{
				err: error,
				query,
				options: {
					...options,
					embeddingLength: queryEmbedding?.length || "unknown",
				},
			},
			"Vector search failed"
		);

		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Find similar chunks to a given chunk using vector similarity
 */
export async function findSimilarChunks(
	chunkId: string,
	options: Omit<VectorSearchOptions, "materialIds"> = {}
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

		// Build the SQL query using template literals
		const query = sql`
			SELECT 
				dc.id,
				dc.content,
				1 - (dc.embedding <=> ${embedding}) as similarity,
				dc.material_id as "materialId",
				dc.chunk_index as "chunkIndex",
				dc.metadata,
				cm.title as "materialTitle"
			FROM document_chunks dc
			LEFT JOIN course_materials cm ON dc.material_id = cm.id
			WHERE dc.id != ${chunkId}
			AND (1 - (dc.embedding <=> ${embedding})) > ${threshold}
			ORDER BY similarity DESC
			LIMIT ${limit}
		`;

		const rawResults = await db.execute(query);

		const results: SearchResult[] = rawResults.map(
			(row: RawSearchResultRow) => ({
				id: row.id,
				content: row.content,
				similarity: row.similarity,
				materialId: row.materialId,
				chunkIndex: row.chunkIndex,
				metadata: row.metadata as Record<string, unknown> | undefined,
				materialTitle: row.materialTitle || undefined,
			})
		);

		return {
			success: true,
			results,
			totalResults: results.length,
		};
	} catch (error) {
		logger.error(
			{
				err: error,
				chunkId,
				options,
			},
			"Similar chunks search failed"
		);

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
		const query = sql`
			SELECT
				dc.id,
				dc.content,
				1 as similarity,
				dc.material_id as "materialId",
				dc.chunk_index as "chunkIndex",
				dc.metadata
			FROM document_chunks dc
			WHERE dc.material_id = ${materialId}
			ORDER BY dc.chunk_index
			LIMIT ${limit} OFFSET ${offset}
		`;

		const rawResults = await db.execute(query);

		const results: SearchResult[] = rawResults.map(
			(row: RawSearchResultRow) => ({
				id: row.id,
				content: row.content,
				similarity: 1,
				materialId: row.materialId,
				chunkIndex: row.chunkIndex,
				metadata: row.metadata as Record<string, unknown> | undefined,
			})
		);

		return {
			success: true,
			results,
			totalResults: results.length,
		};
	} catch (error) {
		logger.error(
			{
				err: error,
				materialId,
				options,
			},
			"Failed to get chunks for material"
		);

		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
