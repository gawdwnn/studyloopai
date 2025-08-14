import { searchWeb } from "@/lib/services/firecrawl";
import { logger } from "@/lib/utils/logger";
import type { UIMessage, UIMessageStreamWriter } from "ai";
import { tool } from "ai";
import { z } from "zod";

const description =
	"SUPPLEMENTAL TOOL for quick internet search. Use for current information, news, simple factual queries, or to supplement course materials when gaps are identified. Provides broad coverage (5-10 results) for general topics and current events. Choose this over enhancedWebSearch for straightforward queries.";

interface Params {
	writer: UIMessageStreamWriter<UIMessage>;
}

export const webSearch = ({ writer }: Params) =>
	tool({
		description,
		inputSchema: z.object({
			query: z
				.string()
				.describe("Search query - be specific and include relevant keywords"),
			numResults: z
				.number()
				.min(1)
				.max(10)
				.default(5)
				.describe("Number of search results to retrieve (1-10)"),
		}),
		execute: async ({ query, numResults }, { toolCallId }) => {
			try {
				logger.info({ query, numResults }, "Tool: Web Search");

				writer.write({
					id: toolCallId,
					type: "data-web-search",
					data: { status: "loading", query },
				});

				const result = await searchWeb(query, numResults);

				if (result.success) {
					writer.write({
						id: toolCallId,
						type: "data-web-search",
						data: {
							status: "done",
							query: result.query,
							resultsCount: result.totalResults,
						},
					});
				} else {
					writer.write({
						id: toolCallId,
						type: "data-web-search",
						data: {
							status: "error",
							query: result.query,
							error: result.error,
						},
					});
				}

				return {
					success: result.success,
					results: result.results,
					query: result.query,
					totalResults: result.totalResults,
					instruction: result.success
						? "SUCCESS: Use web search results to provide well-formatted response. Follow formatting standards: clear headings, bullet points, bold key concepts. Use proper citations [Web: Source Title - Domain] and create organized 'Sources' section at the end."
						: "FAILURE: Acknowledge search limitation professionally, provide relevant general knowledge if available, suggest alternative approaches or resources.",
					error: result.error,
				};
			} catch (error) {
				logger.error(
					{ err: error, tool: "webSearch", query },
					"Web search tool execution failed"
				);

				writer.write({
					id: toolCallId,
					type: "data-web-search",
					data: {
						status: "error",
						query,
						error:
							"Failed to perform web search. Please try rephrasing your query.",
					},
				});

				return {
					success: false,
					error:
						"Failed to perform web search. Please try rephrasing your query.",
					results: [],
				};
			}
		},
	});
