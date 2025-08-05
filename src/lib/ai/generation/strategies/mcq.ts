/**
 * Multiple Choice Questions generation strategy
 */

import { insertMCQs } from "@/lib/services/persist-generated-content-service";
import type { McqsConfig } from "@/types/generation-types";
import { mcqPrompt } from "../prompts/mcq";
import { type MCQ, MCQsObjectSchema } from "../schemas/mcq";
import type { ContentStrategy } from "../types";

/**
 * Create MCQ strategy
 */
export function createMCQStrategy(): ContentStrategy<McqsConfig, MCQ> {
	return {
		contentType: "multipleChoice",
		responseType: "object",

		buildContext: (content: string, config: McqsConfig) => ({
			content,
			difficulty: config.difficulty,
			count: config.count,
			language: "en", // Default language
		}),

		getPrompt: () => mcqPrompt,

		getSchema: () => MCQsObjectSchema,

		extractArrayFromObject: (obj: unknown): MCQ[] => {
			return (obj as { mcqs?: MCQ[] })?.mcqs || [];
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
