/**
 * Golden Notes generation strategy
 */

import { insertGoldenNotes } from "@/lib/services/persist-generated-content-service";
import type { GoldenNotesConfig } from "@/types/generation-types";
import { goldenNotesPrompt } from "../prompts/golden-notes";
import {
	type GoldenNote,
	GoldenNotesObjectSchema,
} from "../schemas/golden-notes";
import type { ContentStrategy } from "../types";

/**
 * Create golden notes strategy
 */
export function createGoldenNotesStrategy(): ContentStrategy<
	GoldenNotesConfig,
	GoldenNote
> {
	return {
		contentType: "goldenNotes",
		responseType: "object",

		buildContext: (content: string, config: GoldenNotesConfig) => ({
			content,
			difficulty: config.difficulty,
			count: config.count,
			focus: config.focus,
			language: "en", // Default language
		}),

		getPrompt: () => goldenNotesPrompt,

		getSchema: () => GoldenNotesObjectSchema,

		extractArrayFromObject: (obj: unknown): GoldenNote[] => {
			const typed = obj as { goldenNotes?: GoldenNote[] };
			return typed?.goldenNotes || [];
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
