import { searchWithContentScrape } from "@/lib/services/firecrawl";
import { logger } from "@/lib/utils/logger";
import type { UIMessage, UIMessageStreamWriter } from "ai";
import { tool } from "ai";
import { z } from "zod";

const description =
	"DEEP RESEARCH TOOL for comprehensive web search with full content scraping. Use for complex research topics requiring in-depth analysis, detailed content extraction, and thorough information gathering (3-5 results with full content). Choose this over webSearch when the query needs deep, analytical coverage rather than broad factual information.";

interface Params {
	writer: UIMessageStreamWriter<UIMessage>;
}

export const enhancedWebSearch = ({ writer }: Params) =>
	tool({
		description,
		inputSchema: z.object({
			query: z
				.string()
				.describe("Research query - be specific and comprehensive"),
			numResults: z
				.number()
				.min(1)
				.max(5)
				.default(3)
				.describe("Number of results to scrape deeply (1-5, default 3)"),
		}),
		execute: async ({ query, numResults }, { toolCallId }) => {
			try {
				logger.info(
					{ query, numResults },
					"Tool: Enhanced Web Search with Content Scraping"
				);

				writer.write({
					id: toolCallId,
					type: "data-enhanced-web-search",
					data: { status: "loading", query, totalResults: numResults },
				});

				writer.write({
					id: toolCallId,
					type: "data-enhanced-web-search",
					data: {
						status: "scraping",
						query,
						currentResult: 1,
						totalResults: numResults,
					},
				});

				const result = await searchWithContentScrape(query, numResults);

				if (result.success) {
					writer.write({
						id: toolCallId,
						type: "data-enhanced-web-search",
						data: {
							status: "done",
							query: result.query,
							totalResults: result.totalResults,
						},
					});
				} else {
					writer.write({
						id: toolCallId,
						type: "data-enhanced-web-search",
						data: {
							status: "error",
							query: result.query,
							error: result.error,
						},
					});
				}

				return {
					success: result.success,
					results: result.results.map((item, index) => ({
						...item,
						citation: `[Enhanced Search ${index + 1}: ${item.title}]`,
						summary:
							item.content.length > 200
								? `${item.content.substring(0, 200)}...`
								: item.content,
						linkCount: item.links.length,
					})),
					query: result.query,
					totalResults: result.totalResults,
					instruction: result.success
						? "SUCCESS: Use enhanced search results with full content for detailed, well-formatted response. Follow formatting standards: clear headings, structured sections, bold key concepts. Use proper citations [Web: Source Title - Domain] and mention relevant links. Create organized 'Sources' section."
						: "FAILURE: Acknowledge enhanced search limitation professionally, provide relevant general knowledge if available, suggest alternative research approaches or specific resources.",
					error: result.error,
				};
			} catch (error) {
				logger.error(
					{ err: error, tool: "enhancedWebSearch", query },
					"Enhanced web search tool execution failed"
				);

				writer.write({
					id: toolCallId,
					type: "data-enhanced-web-search",
					data: {
						status: "error",
						query,
						error:
							"Failed to perform enhanced web search. Please try rephrasing your query.",
					},
				});

				return {
					success: false,
					error:
						"Failed to perform enhanced web search. Please try rephrasing your query.",
					results: [],
				};
			}
		},
	});
