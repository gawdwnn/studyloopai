/**
 * Summaries generation strategy
 */

import { insertSummaries } from "@/lib/services/persist-generated-content-service";
import type { SummariesConfig } from "@/types/generation-types";
import { summariesPrompt } from "../prompts/summaries";
import { SummariesObjectSchema, type Summary } from "../schemas/summaries";
import type { ContentStrategy } from "../types";

/**
 * Create summaries strategy
 */
export function createSummariesStrategy(): ContentStrategy<
	SummariesConfig,
	Summary
> {
	return {
		contentType: "summaries",
		responseType: "object",

		buildContext: (content: string, config: SummariesConfig) => ({
			content,
			difficulty: config.difficulty,
			count: config.count,
			focus: config.focus,
			language: "en", // Default language
		}),

		getPrompt: () => summariesPrompt,

		getSchema: () => SummariesObjectSchema,

		extractArrayFromObject: (obj: unknown): Summary[] => {
			return (obj as { summaries?: Summary[] })?.summaries || [];
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
