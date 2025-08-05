import { env } from "@/env";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";

const xaiProvider = env.XAI_API_KEY
	? createXai({ apiKey: env.XAI_API_KEY })
	: null;

const openaiProvider = env.OPENAI_API_KEY
	? createOpenAI({ apiKey: env.OPENAI_API_KEY })
	: null;

export function getTextGenerationModel() {
	// Temporarily use OpenAI gpt-3.5-turbo for testing
	if (openaiProvider) return openaiProvider("gpt-3.5-turbo");
	if (xaiProvider) return xaiProvider("grok-3");
	throw new Error(
		"No AI provider available. Set XAI_API_KEY or OPENAI_API_KEY."
	);
}

/**
 * Get embedding model with fallback support
 * @param preferredModel - Preferred model name, defaults to text-embedding-3-small
 * @returns Embedding model instance
 */
export function getEmbeddingModel(preferredModel?: string) {
	if (!openaiProvider) {
		throw new Error(
			"OpenAI API key required for embeddings. Set OPENAI_API_KEY."
		);
	}

	// Model hierarchy: try preferred -> 3-small -> 3-large -> ada-002
	const modelHierarchy = [
		preferredModel,
		"text-embedding-3-small",
		"text-embedding-3-large",
		"text-embedding-ada-002",
	].filter(Boolean);

	// For now, use the first available model since we can't detect failures beforehand
	// In production, you'd implement retry logic with different models
	const model = modelHierarchy[0] || "text-embedding-3-small";

	return openaiProvider.textEmbeddingModel(model as string);
}

/**
 * Get embedding model dimensions based on model name
 */
export function getEmbeddingDimensions(model: string): number {
	const dimensions: Record<string, number> = {
		"text-embedding-3-small": 1536,
		"text-embedding-3-large": 3072,
		"text-embedding-ada-002": 1536,
	};

	return dimensions[model] || 1536;
}
