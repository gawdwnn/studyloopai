/**
 * New functional AI content generation API
 * This replaces the old monolithic generic-generator.ts
 */

import { executeGenerationPipeline } from "./core/pipeline";
import { registerStrategy } from "./core/strategy-factory";
import { createConceptMapsStrategy } from "./strategies/concept-maps";
import { createCuecardsStrategy } from "./strategies/cuecards";
import { createGoldenNotesStrategy } from "./strategies/golden-notes";
import { createMCQStrategy } from "./strategies/mcq";
import { createOpenQuestionsStrategy } from "./strategies/open-questions";
import { createSummariesStrategy } from "./strategies/summaries";
import type {
	ConfigMap,
	GenerationRequest,
	GenerationResult,
	SupportedContentType,
} from "./types";

// Register all available strategies
registerStrategy("goldenNotes", createGoldenNotesStrategy);
registerStrategy("cuecards", createCuecardsStrategy);
registerStrategy("multipleChoice", createMCQStrategy);
registerStrategy("openQuestions", createOpenQuestionsStrategy);
registerStrategy("summaries", createSummariesStrategy);
registerStrategy("conceptMaps", createConceptMapsStrategy);

/**
 * New generateContent function using functional pipeline
 * This replaces the monolithic generic-generator.ts function
 */
export async function generateContent<T extends SupportedContentType>(
	request: GenerationRequest<T>
): Promise<GenerationResult> {
	return executeGenerationPipeline(request);
}

/**
 * Backward compatibility wrapper for the old API
 * This maintains the same interface as the original function
 */
export async function generateContentLegacy(
	options: Record<string, unknown>
): Promise<GenerationResult> {
	return generateContent({
		contentType: options.contentType as SupportedContentType,
		courseId: options.courseId as string,
		weekId: options.weekId as string,
		materialIds: options.materialIds as string[],
		config: options.config as ConfigMap[SupportedContentType],
		cacheKey: options.cacheKey as string | undefined,
		options: {
			maxTokens: options.maxTokens as number | undefined,
			temperature: options.temperature as number | undefined,
		},
	});
}

// Export the new API
export type { GenerationRequest, GenerationResult } from "./types";
export { registerStrategy, hasStrategy } from "./core/strategy-factory";
