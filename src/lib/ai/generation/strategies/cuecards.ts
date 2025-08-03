/**
 * Cuecards generation strategy
 */

import { insertCuecards } from "@/lib/services/persist-generated-content-service";
import type { CuecardsConfig } from "@/types/generation-types";
import { cuecardsPrompt } from "../prompts/cuecards";
import { type Cuecard, CuecardsArraySchema } from "../schemas/cuecards";
import type { ContentStrategy } from "../types";
import { parseJsonArrayResponse } from "../utils";

/**
 * Create cuecards strategy
 */
export function createCuecardsStrategy(): ContentStrategy<
	CuecardsConfig,
	Cuecard
> {
	return {
		contentType: "cuecards",
		responseType: "array",

		buildContext: (content: string, config: CuecardsConfig) => ({
			content,
			difficulty: config.difficulty,
			count: config.count,
			language: "en", // Default language
		}),

		getPrompt: () => cuecardsPrompt,

		getSchema: () => CuecardsArraySchema,

		parseResponse: (response: string): Cuecard[] => {
			return parseJsonArrayResponse(response, CuecardsArraySchema, []);
		},

		persist: async (
			data: Cuecard[],
			courseId: string,
			weekId: string
		): Promise<void> => {
			await insertCuecards(data, courseId, weekId);
		},
	};
}
