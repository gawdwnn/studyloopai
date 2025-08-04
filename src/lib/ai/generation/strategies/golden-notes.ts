/**
 * Golden Notes generation strategy
 */

import { insertGoldenNotes } from "@/lib/services/persist-generated-content-service";
import type { GoldenNotesConfig } from "@/types/generation-types";
import { goldenNotesPrompt } from "../prompts/golden-notes";
import {
	type GoldenNote,
	GoldenNotesArraySchema,
} from "../schemas/golden-notes";
import type { ContentStrategy } from "../types";
import { parseJsonArrayResponse } from "../utils";

/**
 * Create golden notes strategy
 */
export function createGoldenNotesStrategy(): ContentStrategy<
	GoldenNotesConfig,
	GoldenNote
> {
	return {
		contentType: "goldenNotes",
		responseType: "array",

		buildContext: (content: string, config: GoldenNotesConfig) => ({
			content,
			difficulty: config.difficulty,
			count: config.count,
			focus: config.focus,
			language: "en", // Default language
		}),

		getPrompt: () => goldenNotesPrompt,

		getSchema: () => GoldenNotesArraySchema,

		parseResponse: (response: string): GoldenNote[] => {
			return parseJsonArrayResponse(response, GoldenNotesArraySchema, []);
		},

		persist: async (
			data: GoldenNote[],
			courseId: string,
			weekId: string
		): Promise<void> => {
			await insertGoldenNotes(data, courseId, weekId);
		},
	};
}
