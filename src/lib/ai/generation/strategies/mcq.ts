/**
 * Multiple Choice Questions generation strategy
 */

import { insertMCQs } from "@/lib/services/persist-generated-content-service";
import type { McqsConfig } from "@/types/generation-types";
import { mcqPrompt } from "../prompts/mcq";
import { type MCQ, MCQsArraySchema } from "../schemas/mcq";
import type { ContentStrategy } from "../types";
import { parseJsonArrayResponse } from "../utils";

/**
 * Create MCQ strategy
 */
export function createMCQStrategy(): ContentStrategy<McqsConfig, MCQ> {
	return {
		contentType: "multipleChoice",
		responseType: "array",

		buildContext: (content: string, config: McqsConfig) => ({
			content,
			difficulty: config.difficulty,
			count: config.count,
			language: "en", // Default language
		}),

		getPrompt: () => mcqPrompt,

		getSchema: () => MCQsArraySchema,

		parseResponse: (response: string): MCQ[] => {
			return parseJsonArrayResponse(response, MCQsArraySchema, []);
		},

		persist: async (
			data: MCQ[],
			courseId: string,
			weekId: string
		): Promise<void> => {
			await insertMCQs(data, courseId, weekId);
		},
	};
}
