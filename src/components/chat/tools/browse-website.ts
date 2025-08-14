import { scrapeUrl } from "@/lib/services/firecrawl";
import { logger } from "@/lib/utils/logger";
import type { UIMessage, UIMessageStreamWriter } from "ai";
import { tool } from "ai";
import { z } from "zod";

const description =
	"TARGETED TOOL for analyzing specific URLs. Use when the user provides specific website links or when you need to verify/analyze content from a particular site. Extracts detailed content, links, images, and structured data from specified web pages. Do not use for general search - use webSearch or enhancedWebSearch instead.";

interface Params {
	writer: UIMessageStreamWriter<UIMessage>;
}

export const browseWebsite = ({ writer }: Params) =>
	tool({
		description,
		inputSchema: z.object({
			url: z
				.url()
				.describe(
					"The complete URL to browse (must include http:// or https://)"
				),
			focusAreas: z
				.array(z.string())
				.optional()
				.describe(
					"Specific topics or sections to focus on when extracting content"
				),
		}),
		execute: async ({ url, focusAreas }, { toolCallId }) => {
			try {
				logger.info({ url, focusAreas }, "Tool: Browse Website");

				writer.write({
					id: toolCallId,
					type: "data-browse-website",
					data: { status: "loading", url },
				});

				writer.write({
					id: toolCallId,
					type: "data-browse-website",
					data: { status: "extracting", url },
				});

				const result = await scrapeUrl(url, focusAreas);

				// Handle both single result and array result (should be single for single URL)
				const singleResult = Array.isArray(result) ? result[0] : result;

				if (singleResult.success) {
					writer.write({
						id: toolCallId,
						type: "data-browse-website",
						data: {
							status: "done",
							url: singleResult.url,
							title: singleResult.title,
						},
					});
				} else {
					writer.write({
						id: toolCallId,
						type: "data-browse-website",
						data: {
							status: "error",
							url: singleResult.url,
							error: singleResult.error,
						},
					});
				}

				return {
					success: singleResult.success,
					url: singleResult.url,
					title: singleResult.title,
					content: singleResult.content,
					extractedSections: singleResult.extractedSections,
					source: singleResult.source,
					instruction: singleResult.success
						? "SUCCESS: Use extracted website content to provide well-formatted response. Follow formatting standards: clear headings, structured sections, proper citations [Web: Site Title - Domain]. Reference specific sections when relevant."
						: "FAILURE: Acknowledge website access limitation professionally, suggest alternative URLs or approaches if applicable.",
					error: singleResult.error,
				};
			} catch (error) {
				logger.error(
					{ err: error, tool: "browseWebsite", url },
					"Website browsing tool execution failed"
				);

				writer.write({
					id: toolCallId,
					type: "data-browse-website",
					data: {
						status: "error",
						url,
						error:
							"Failed to browse website. Please check the URL and try again.",
					},
				});

				return {
					success: false,
					error:
						"Failed to browse website. Please check the URL and try again.",
					content: "",
				};
			}
		},
	});
