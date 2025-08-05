/**
 * Open Questions generation strategy
 */

import { insertOpenQuestions } from "@/lib/services/persist-generated-content-service";
import type { OpenQuestionsConfig } from "@/types/generation-types";
import { openQuestionsPrompt } from "../prompts/open-questions";
import {
	type OpenQuestion,
	OpenQuestionsObjectSchema,
} from "../schemas/open-questions";
import type { ContentStrategy } from "../types";

/**
 * Create open questions strategy
 */
export function createOpenQuestionsStrategy(): ContentStrategy<
	OpenQuestionsConfig,
	OpenQuestion
> {
	return {
		contentType: "openQuestions",
		responseType: "object",

		buildContext: (content: string, config: OpenQuestionsConfig) => ({
			content,
			difficulty: config.difficulty,
			count: config.count,
			language: "en", // Default language
		}),

		getPrompt: () => openQuestionsPrompt,

		getSchema: () => OpenQuestionsObjectSchema,

		extractArrayFromObject: (obj: unknown): OpenQuestion[] => {
			return (obj as { openQuestions?: OpenQuestion[] })?.openQuestions || [];
		},

		persist: async (
			data: OpenQuestion[],
			courseId: string,
			weekId: string
		): Promise<void> => {
			await insertOpenQuestions(data, courseId, weekId);
		},
	};
}
