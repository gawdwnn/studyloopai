/**
 * Concept Maps generation strategy
 */

import { insertConceptMaps } from "@/lib/services/persist-generated-content-service";
import type { ConceptMapsConfig } from "@/types/generation-types";
import { conceptMapsPrompt } from "../prompts/concept-maps";
import { type ConceptMap, ConceptMapSchema } from "../schemas/concept-maps";
import type { ContentStrategy } from "../types";
import { parseJsonObjectResponse } from "../utils";

/**
 * Create concept maps strategy
 */
export function createConceptMapsStrategy(): ContentStrategy<
	ConceptMapsConfig,
	ConceptMap
> {
	return {
		contentType: "conceptMaps",
		responseType: "object", // Concept maps are typically single objects

		buildContext: (content: string, config: ConceptMapsConfig) => ({
			content,
			difficulty: config.difficulty,
			style: config.style || "hierarchical",
			focus: config.focus || "conceptual",
			language: "en", // Default language
		}),

		getPrompt: () => conceptMapsPrompt,

		getSchema: () => ConceptMapSchema,

		parseResponse: (response: string): ConceptMap[] => {
			// Parse as single object and wrap in array for consistency
			const conceptMap = parseJsonObjectResponse(
				response,
				ConceptMapSchema,
				{} as ConceptMap
			);
			return conceptMap && Object.keys(conceptMap).length > 0
				? [conceptMap]
				: [];
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
