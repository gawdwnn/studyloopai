import { env } from "@/env";
import { logger } from "@/lib/utils/logger";
import FirecrawlApp from "@mendable/firecrawl-js";

// Initialize Firecrawl client
function getFirecrawlClient() {
	if (!env.FIRECRAWL_API_KEY) {
		throw new Error("FIRECRAWL_API_KEY is required for web content extraction");
	}
	return new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });
}

// Retry logic with exponential backoff
async function withRetry<T>(
	operation: () => Promise<T>,
	maxRetries = 3,
	baseDelay = 1000
): Promise<T> {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			if (attempt === maxRetries) throw error;

			const delay = baseDelay * 2 ** (attempt - 1);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
	throw new Error("Max retries exceeded");
}

// Common result type for both single and batch scraping
type ScrapeResult = {
	success: boolean;
	url: string;
	title: string;
	content: string;
	extractedSections: string[];
	source: string;
	error?: string;
};

/**
 * Enhanced scrape function that supports both single URL and batch URLs
 * Uses Firecrawl's scraping capability to extract clean content from websites
 */
export async function scrapeUrl(
	url?: string,
	focusAreas?: string[],
	urls?: string[]
): Promise<ScrapeResult | ScrapeResult[]> {
	const firecrawl = getFirecrawlClient();

	const params = {
		formats: ["markdown" as const],
		waitFor: 2000, // Wait 2 seconds for dynamic content
		timeout: 15000, // 15 second timeout
	};

	let result: any;

	try {
		// Handle single URL scraping
		if (url && typeof url === "string") {
			// Basic URL validation
			const urlObj = new URL(url);
			if (!["http:", "https:"].includes(urlObj.protocol)) {
				return {
					success: false,
					url,
					title: urlObj.hostname,
					content: "",
					extractedSections: [],
					source: `Website: ${urlObj.hostname}`,
					error:
						"Invalid URL protocol. Only HTTP and HTTPS URLs are supported.",
				};
			}

			logger.info("Firecrawl: Starting single URL scrape", { url, focusAreas });

			result = await withRetry(async () => {
				return await firecrawl.scrapeUrl(url, params);
			});

			if (!result.success) {
				throw new Error("Firecrawl scraping failed - no data returned");
			}

			const title = result.metadata?.title || urlObj.hostname;
			const content = result.markdown || "";

			// Extract focused sections if specified
			let extractedSections: string[] = [];
			if (focusAreas && focusAreas.length > 0 && content) {
				extractedSections = focusAreas.filter((area) =>
					content.toLowerCase().includes(area.toLowerCase())
				);
			}

			logger.info("Firecrawl: Single URL scrape completed", {
				url,
				contentLength: content.length,
				title,
				extractedSections: extractedSections.length,
			});

			return {
				success: true,
				url,
				title,
				content,
				extractedSections,
				source: `Website: ${title}`,
			};
		}
		// Handle batch URL scraping
		if (urls && Array.isArray(urls)) {
			// Validate all URLs
			const validUrls: string[] = [];
			const invalidUrls: string[] = [];

			for (const batchUrl of urls) {
				try {
					const urlObj = new URL(batchUrl);
					if (["http:", "https:"].includes(urlObj.protocol)) {
						validUrls.push(batchUrl);
					} else {
						invalidUrls.push(batchUrl);
					}
				} catch {
					invalidUrls.push(batchUrl);
				}
			}

			if (validUrls.length === 0) {
				throw new Error("No valid URLs provided for batch scraping");
			}

			logger.info("Firecrawl: Starting batch URL scrape", {
				totalUrls: urls.length,
				validUrls: validUrls.length,
				invalidUrls: invalidUrls.length,
				focusAreas,
			});

			result = await withRetry(async () => {
				return await firecrawl.batchScrapeUrls(validUrls, params);
			});

			if (!result.success || !result.data) {
				throw new Error("Firecrawl batch scraping failed - no data returned");
			}

			// Process batch results
			const batchResults: ScrapeResult[] = result.data.map((item: any) => {
				const urlObj = new URL(item.url || "");
				const title = item.metadata?.title || urlObj.hostname;
				const content = item.markdown || "";

				// Extract focused sections if specified
				let extractedSections: string[] = [];
				if (focusAreas && focusAreas.length > 0 && content) {
					extractedSections = focusAreas.filter((area) =>
						content.toLowerCase().includes(area.toLowerCase())
					);
				}

				return {
					success: true,
					url: item.url || "",
					title,
					content,
					extractedSections,
					source: `Website: ${title}`,
				};
			});

			// Add failed URLs as error results
			for (const invalidUrl of invalidUrls) {
				batchResults.push({
					success: false,
					url: invalidUrl,
					title: "Invalid URL",
					content: "",
					extractedSections: [],
					source: "Invalid URL",
					error:
						"Invalid URL protocol. Only HTTP and HTTPS URLs are supported.",
				});
			}

			logger.info("Firecrawl: Batch URL scrape completed", {
				totalRequested: urls.length,
				successfulScrapes: result.data.length,
				totalResults: batchResults.length,
			});

			return batchResults;
		}

		throw new Error("Either 'url' or 'urls' parameter must be provided");
	} catch (error) {
		if (urls && Array.isArray(urls)) {
			logger.error(
				{
					err: error,
					service: "firecrawl",
					operation: "batchScrapeUrls",
					urlCount: urls.length,
					focusAreas,
				},
				"Firecrawl batch scraping failed"
			);

			// Return error results for all URLs in batch
			return urls.map((batchUrl) => ({
				success: false,
				error:
					"Unable to scrape website content. Please try again or provide different URLs.",
				url: batchUrl,
				title: "Error",
				content: "",
				extractedSections: [],
				source: "Error",
			}));
		}

		logger.error(
			{
				err: error,
				service: "firecrawl",
				operation: "scrapeUrl",
				url,
				focusAreas,
			},
			"Firecrawl scraping failed"
		);

		// Return graceful fallback for single URL
		return {
			success: false,
			error:
				"Unable to scrape website content. Please try again or provide a different URL.",
			url: url || "",
			title: url ? new URL(url).hostname : "Error",
			content: "",
			extractedSections: [],
			source: url ? `Website: ${new URL(url).hostname}` : "Error",
		};
	}
}

/**
 * Batch scrape multiple URLs - convenience wrapper around enhanced scrapeUrl function
 */
export async function batchScrapeUrls(
	urls: string[],
	focusAreas?: string[]
): Promise<ScrapeResult[]> {
	const result = await scrapeUrl(undefined, focusAreas, urls);
	return Array.isArray(result) ? result : [result];
}

// Enhanced result type for search with content scraping
type SearchResult = {
	title: string;
	url: string;
	snippet: string;
	source: string;
	content?: string;
	links?: string[];
};

/**
 * Enhanced search web function with optional content scraping
 * Uses Firecrawl's search capability with scrapeOptions for richer content extraction
 */
export async function searchWeb(
	query: string,
	numResults = 5,
	scrapeContent = false
): Promise<{
	success: boolean;
	results: SearchResult[];
	query: string;
	totalResults: number;
	error?: string;
}> {
	try {
		const firecrawl = getFirecrawlClient();

		// Validate input
		if (!query || query.trim().length === 0) {
			return {
				success: false,
				results: [],
				query,
				totalResults: 0,
				error: "Search query cannot be empty",
			};
		}

		// Limit results to reasonable range
		const limitedResults = Math.min(Math.max(numResults, 1), 10);

		logger.info("Firecrawl: Starting web search", {
			query,
			numResults: limitedResults,
			scrapeContent,
		});

		// Configure search options based on whether content scraping is requested
		const searchOptions = scrapeContent
			? {
					limit: limitedResults,
					scrapeOptions: {
						formats: ["markdown" as const, "links" as const],
						waitFor: 2000,
						timeout: 15000,
					},
				}
			: {
					limit: limitedResults,
					format: "markdown" as const,
				};

		const result = await withRetry(async () => {
			return await firecrawl.search(query, searchOptions);
		});

		if (!result.success || !result.data) {
			throw new Error("Firecrawl search failed - no data returned");
		}

		const searchResults: SearchResult[] = result.data.map((item) => {
			const baseResult: SearchResult = {
				title: item.metadata?.title || item.title || "Untitled",
				url: item.url || "",
				snippet: item.markdown || "No content available",
				source: `Web Search: ${item.metadata?.title || item.title || (item.url ? new URL(item.url).hostname : "Unknown")}`,
			};

			// Add enhanced content if scraping was enabled
			if (scrapeContent) {
				baseResult.content = item.markdown || "";
				baseResult.links = item.links || [];
			}

			return baseResult;
		});

		logger.info("Firecrawl: Web search completed", {
			query,
			resultsFound: searchResults.length,
			totalResults: searchResults.length,
			scrapeContent,
		});

		return {
			success: true,
			results: searchResults,
			query,
			totalResults: searchResults.length,
		};
	} catch (error) {
		logger.error(
			{
				err: error,
				service: "firecrawl",
				operation: "searchWeb",
				query,
				numResults,
				scrapeContent,
			},
			"Firecrawl web search failed"
		);

		return {
			success: false,
			results: [],
			query,
			totalResults: 0,
			error:
				"Unable to perform web search. Please try again with a different query.",
		};
	}
}

/**
 * Search with full content scraping - convenience function for rich content extraction
 * Uses Firecrawl's search with scrapeOptions to get comprehensive content, links, and images
 */
export async function searchWithContentScrape(
	query: string,
	numResults = 3
): Promise<{
	success: boolean;
	results: Array<{
		title: string;
		url: string;
		content: string;
		links: string[];
		source: string;
	}>;
	query: string;
	totalResults: number;
	error?: string;
}> {
	try {
		const firecrawl = getFirecrawlClient();

		// Validate input
		if (!query || query.trim().length === 0) {
			return {
				success: false,
				results: [],
				query,
				totalResults: 0,
				error: "Search query cannot be empty",
			};
		}

		// Limit results to reasonable range for content scraping (more intensive)
		const limitedResults = Math.min(Math.max(numResults, 1), 5);

		logger.info("Firecrawl: Starting search with content scraping", {
			query,
			numResults: limitedResults,
		});

		const result = await withRetry(async () => {
			return await firecrawl.search(query, {
				limit: limitedResults,
				scrapeOptions: {
					formats: ["markdown" as const, "links" as const],
					waitFor: 2000,
					timeout: 20000, // Longer timeout for content scraping
				},
			});
		});

		if (!result.success || !result.data) {
			throw new Error(
				"Firecrawl content scraping search failed - no data returned"
			);
		}

		const enrichedResults = result.data.map((item) => ({
			title: item.metadata?.title || item.title || "Untitled",
			url: item.url || "",
			content: item.markdown || "No content available",
			links: item.links || [],
			source: `Web Search: ${item.metadata?.title || item.title || (item.url ? new URL(item.url).hostname : "Unknown")}`,
		}));

		logger.info("Firecrawl: Search with content scraping completed", {
			query,
			resultsFound: enrichedResults.length,
			totalResults: enrichedResults.length,
			avgContentLength:
				enrichedResults.length > 0
					? enrichedResults.reduce((sum, r) => sum + r.content.length, 0) /
						enrichedResults.length
					: 0,
			totalLinks: enrichedResults.reduce((sum, r) => sum + r.links.length, 0),
		});

		return {
			success: true,
			results: enrichedResults,
			query,
			totalResults: enrichedResults.length,
		};
	} catch (error) {
		logger.error(
			{
				err: error,
				service: "firecrawl",
				operation: "searchWithContentScrape",
				query,
				numResults,
			},
			"Firecrawl search with content scraping failed"
		);

		return {
			success: false,
			results: [],
			query,
			totalResults: 0,
			error:
				"Unable to perform content scraping search. Please try again with a different query.",
		};
	}
}
