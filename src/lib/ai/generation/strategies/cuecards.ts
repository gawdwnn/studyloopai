/**
 * Cuecards generation strategy
 */

import { insertCuecards } from "@/lib/services/persist-generated-content-service";
import type { CuecardsConfig } from "@/types/generation-types";
import { cuecardsPrompt } from "../prompts/cuecards";
import { type Cuecard, CuecardsObjectSchema } from "../schemas/cuecards";
import type { ContentStrategy } from "../types";

/**
 * Create cuecards strategy
 */
export function createCuecardsStrategy(): ContentStrategy<
	CuecardsConfig,
	Cuecard
> {
	return {
		contentType: "cuecards",
		responseType: "object",

		buildContext: (content: string, config: CuecardsConfig) => ({
			content,
			difficulty: config.difficulty,
			count: config.count,
			language: "en", // Default language
		}),

		getPrompt: () => cuecardsPrompt,

		getSchema: () => CuecardsObjectSchema,

		extractArrayFromObject: (obj: unknown): Cuecard[] => {
			const typed = obj as { cuecards?: Cuecard[] };
			return typed?.cuecards || [];
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
