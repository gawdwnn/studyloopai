/**
 * Concept Maps generation strategy
 */

import { insertConceptMaps } from "@/lib/services/persist-generated-content-service";
import type { ConceptMapsConfig } from "@/types/generation-types";
import { conceptMapsPrompt } from "../prompts/concept-maps";
import {
	type ConceptMap,
	ConceptMapsObjectSchema,
} from "../schemas/concept-maps";
import type { ContentStrategy } from "../types";

/**
 * Create concept maps strategy
 */
export function createConceptMapsStrategy(): ContentStrategy<
	ConceptMapsConfig,
	ConceptMap
> {
	return {
		contentType: "conceptMaps",
		responseType: "object",

		buildContext: (content: string, config: ConceptMapsConfig) => ({
			content,
			difficulty: config.difficulty,
			style: config.style || "hierarchical",
			focus: config.focus || "conceptual",
			language: "en", // Default language
		}),

		getPrompt: () => conceptMapsPrompt,

		getSchema: () => ConceptMapsObjectSchema,

		extractArrayFromObject: (obj: unknown): ConceptMap[] => {
			return (obj as { conceptMaps?: ConceptMap[] })?.conceptMaps || [];
		},

		persist: async (
			data: ConceptMap[],
			courseId: string,
			weekId: string
		): Promise<void> => {
			await insertConceptMaps(data, courseId, weekId);
		},
	};
}
