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
import type { GenerationRequest, SupportedContentType } from "./types";

// Register all available strategies
registerStrategy("goldenNotes", createGoldenNotesStrategy);
registerStrategy("cuecards", createCuecardsStrategy);
registerStrategy("multipleChoice", createMCQStrategy);
registerStrategy("openQuestions", createOpenQuestionsStrategy);
registerStrategy("summaries", createSummariesStrategy);
registerStrategy("conceptMaps", createConceptMapsStrategy);

/**
 * New generateContent function using functional pipeline
 */
export async function generateContent<T extends SupportedContentType>(
	request: GenerationRequest<T>
): Promise<void> {
	const result = await executeGenerationPipeline(request);

	if (!result.success) {
		throw new Error(result.error || "Content generation failed");
	}
}

export type { GenerationRequest } from "./types";
export { registerStrategy, hasStrategy } from "./core/strategy-factory";
