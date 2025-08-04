/**
 * Summaries generation strategy
 */

import { insertSummaries } from "@/lib/services/persist-generated-content-service";
import type { SummariesConfig } from "@/types/generation-types";
import { summariesPrompt } from "../prompts/summaries";
import { type Summary, SummarySchema } from "../schemas/summaries";
import type { ContentStrategy } from "../types";
import { parseJsonObjectResponse } from "../utils";

/**
 * Create summaries strategy
 */
export function createSummariesStrategy(): ContentStrategy<
	SummariesConfig,
	Summary
> {
	return {
		contentType: "summaries",
		responseType: "object", // Summaries are typically single objects

		buildContext: (content: string, config: SummariesConfig) => ({
			content,
			difficulty: config.difficulty,
			count: config.count,
			focus: config.focus,
			language: "en", // Default language
		}),

		getPrompt: () => summariesPrompt,

		getSchema: () => SummarySchema,

		parseResponse: (response: string): Summary[] => {
			// Parse as single object and wrap in array for consistency
			const summary = parseJsonObjectResponse(
				response,
				SummarySchema,
				{} as Summary
			);
			return summary && Object.keys(summary).length > 0 ? [summary] : [];
		},

		persist: async (
			data: Summary[],
			courseId: string,
			weekId: string
		): Promise<void> => {
			await insertSummaries(data, courseId, weekId);
		},
	};
}
