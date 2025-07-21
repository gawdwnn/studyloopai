/** Request payload for vector search */
export interface SearchRequest {
	query: string;
	materialIds?: string[];
	limit?: number;
	threshold?: number;
}

/** Individual search result */
export interface SearchResult {
	id: string;
	content: string;
	similarity: number;
	materialId: string;
	metadata?: {
		title?: string;
		fileName?: string;
		chunkIndex?: number;
		totalChunks?: number;
	};
}

/** Response from search API */
export interface SearchResponse {
	success: true;
	results: SearchResult[];
	totalResults: number;
	searchTime: number;
}

/** Searches for content using vector similarity */
export async function searchContent(
	request: SearchRequest
): Promise<SearchResponse> {
	const res = await fetch("/api/search", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(request),
	});

	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(errorText || `Search failed: ${res.status}`);
	}

	return res.json() as Promise<SearchResponse>;
}

/** 
 * Convenience function for simple text search with defaults
 * Uses default limit of 10 and threshold of 0.7
 */
export async function simpleSearch(
	query: string,
	materialIds?: string[]
): Promise<SearchResponse> {
	return searchContent({
		query,
		materialIds,
		limit: 10,
		threshold: 0.7,
	});
}

/**
 * Search within specific materials with custom parameters
 */
export async function searchInMaterials(
	query: string,
	materialIds: string[],
	options?: {
		limit?: number;
		threshold?: number;
	}
): Promise<SearchResponse> {
	return searchContent({
		query,
		materialIds,
		limit: options?.limit || 10,
		threshold: options?.threshold || 0.7,
	});
}