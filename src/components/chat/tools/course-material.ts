import { logger } from "@/lib/utils/logger";
import { searchSimilarChunks } from "@/lib/vector/vector-search";
import type { UIMessage, UIMessageStreamWriter } from "ai";
import { tool } from "ai";
import { z } from "zod";

const description =
	"PRIMARY TOOL for course-tagged queries. Search through course materials using semantic vector search to find relevant information from the user's knowledge base. Use this FIRST when courses are available, then assess if supplemental web search is needed based on result quality and query complexity.";

interface Params {
	writer: UIMessageStreamWriter<UIMessage>;
	courseIds: string[];
}

/**
 * Creates a course-scoped RAG search tool that searches vector embeddings
 * within specific course materials. Used in COURSE-SCOPED MODE when user
 * tags courses with @CourseName syntax.
 */
export const createGetCourseMaterial = ({ writer, courseIds }: Params) =>
	tool({
		description,
		inputSchema: z.object({
			question: z
				.string()
				.describe(
					"The user's question or query to search for in course materials"
				),
			searchContext: z
				.string()
				.optional()
				.describe("Additional context to improve search results"),
		}),
		execute: async ({ question, searchContext }, { toolCallId }) => {
			try {
				logger.info(
					{ question, courseIds, searchContext },
					"Tool: Searching course materials"
				);

				writer.write({
					id: toolCallId,
					type: "data-course-material",
					data: { status: "loading", question, courseIds },
				});

				if (courseIds.length === 0) {
					writer.write({
						id: toolCallId,
						type: "data-course-material",
						data: {
							status: "error",
							question,
							courseIds,
							error:
								"No courses specified for search. Please specify course context using @CourseName.",
						},
					});

					return {
						success: false,
						error:
							"No courses specified for search. Please specify course context using @CourseName.",
						results: [],
					};
				}

				writer.write({
					id: toolCallId,
					type: "data-course-material",
					data: { status: "searching", question, courseIds },
				});

				// Combine question with search context for better results
				const searchQuery = searchContext
					? `${question} ${searchContext}`
					: question;

				const results = await searchSimilarChunks(searchQuery, {
					limit: 6,
					threshold: 0.5, // Lowered from 0.7 to 0.5 for better recall
					courseIds,
					includeMetadata: true,
				});

				if (!results.success) {
					logger.error(
						{
							err: results.error,
							tool: "getCourseMaterial",
							question,
							courseIds,
						},
						"Course materials search tool failed"
					);

					writer.write({
						id: toolCallId,
						type: "data-course-material",
						data: {
							status: "error",
							question,
							courseIds,
							error: "Failed to search course materials. Please try again.",
						},
					});

					return {
						success: false,
						error: "Failed to search course materials. Please try again.",
						results: [],
					};
				}

				// Format results for the AI model and frontend citations
				const formattedResults =
					results.results?.map((chunk, index) => ({
						id: chunk.id,
						content: chunk.content,
						source: chunk.materialTitle || "Course Material",
						materialId: chunk.materialId,
						similarity: chunk.similarity,
						citation: `[Source ${index + 1}: ${chunk.materialTitle || "Course Material"}]`,
					})) || [];

				logger.info(
					{
						question,
						resultsCount: formattedResults.length,
						totalFound: results.totalResults,
					},
					"Tool search completed"
				);

				writer.write({
					id: toolCallId,
					type: "data-course-material",
					data: {
						status: "done",
						question,
						courseIds,
						resultsCount: formattedResults.length,
					},
				});

				// Handle empty course materials intelligently with structured guidance
				if (formattedResults.length === 0) {
					return {
						success: true,
						results: [],
						totalFound: 0,
						searchTime: results.searchTime,
						instruction:
							"EMPTY RESULTS PROTOCOL: Follow these steps: 1) Acknowledge the search attempt clearly ('I searched your course materials for...'), 2) Explain what you searched for and why no results were found, 3) Suggest alternative search terms or related topics from their materials, 4) Offer to search web sources for general information on this topic, 5) Use proper formatting with clear headings and structure. Always provide substantive, well-formatted response despite empty results.",
					};
				}

				return {
					success: true,
					results: formattedResults,
					totalFound: results.totalResults,
					searchTime: results.searchTime,
					instruction:
						"SUCCESS: Use these course materials to provide a comprehensive, well-formatted response. Follow formatting standards: use clear headings, bullet points, bold key concepts, limit paragraphs to 3-4 sentences. Include proper citations [Course: Material Name] and synthesize information clearly. End with organized 'Course Sources' section.",
				};
			} catch (error) {
				logger.error(
					{ err: error, tool: "getCourseMaterial", question },
					"Course materials tool execution failed"
				);

				writer.write({
					id: toolCallId,
					type: "data-course-material",
					data: {
						status: "error",
						question,
						courseIds,
						error: "An error occurred while searching course materials.",
					},
				});

				return {
					success: false,
					error: "An error occurred while searching course materials.",
					results: [],
				};
			}
		},
	});
