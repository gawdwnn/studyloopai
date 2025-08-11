import { env } from "@/env";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";

const xaiProvider = env.XAI_API_KEY
	? createXai({ apiKey: env.XAI_API_KEY })
	: null;

const openaiProvider = env.OPENAI_API_KEY
	? createOpenAI({ apiKey: env.OPENAI_API_KEY })
	: null;

const mistralProvider = env.MISTRAL_API_KEY
	? createMistral({ apiKey: env.MISTRAL_API_KEY })
	: null;

const anthropicProvider = env.ANTHROPIC_API_KEY
	? createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
	: null;

/**
 * Get text generation model with fallback support and cost optimization
 * @param preferredModel - Preferred model name, defaults to cheapest available
 * @returns Text generation model instance with hierarchy fallback
 */
export function getTextGenerationModel(preferredModel?: string) {
	// Model hierarchy: try preferred -> cheapest -> balanced -> premium
	const modelHierarchy = [
		preferredModel,
		// Cheapest options first
		"gpt-4o-mini", // OpenAI: ~$0.15/$0.60 per 1M tokens (cheapest!)
		"gpt-3.5-turbo", // OpenAI: ~$0.50/$1.50 per 1M tokens
		"mistral-small-latest", // Mistral: ~$2 per 1M tokens
		"claude-3-haiku-20240307", // Anthropic: ~$0.25/$1.25 per 1M tokens
		"grok-3", // xAI: ~$2 per 1M tokens
	].filter(Boolean);

	// Try each model in order of availability and cost
	for (const model of modelHierarchy) {
		if (model?.startsWith("gpt-") && openaiProvider) {
			return {
				model: openaiProvider(model as string),
				modelName: model,
				provider: "openai",
			};
		}
		if (model?.startsWith("mistral-") && mistralProvider) {
			return {
				model: mistralProvider(model as string),
				modelName: model,
				provider: "mistral",
			};
		}
		if (model?.startsWith("grok-") && xaiProvider) {
			return {
				model: xaiProvider(model as string),
				modelName: model,
				provider: "xai",
			};
		}
		if (model?.startsWith("claude-") && anthropicProvider) {
			return {
				model: anthropicProvider(model as string),
				modelName: model,
				provider: "anthropic",
			};
		}
	}

	throw new Error(
		"No AI provider available. Set OPENAI_API_KEY, MISTRAL_API_KEY, XAI_API_KEY, or ANTHROPIC_API_KEY."
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

	return openaiProvider.textEmbedding(model as string);
}

/**
 * Get Mistral model with fallback support for OCR processing
 * @param preferredModel - Preferred model name, defaults to mistral-small-latest
 * @returns Mistral model instance with hierarchy fallback
 */
export function getMistralModel(preferredModel?: string) {
	if (!mistralProvider) {
		throw new Error("Mistral API key required. Set MISTRAL_API_KEY.");
	}

	// Model hierarchy: try preferred -> small -> medium -> large
	const modelHierarchy = [
		preferredModel,
		"mistral-small-latest",
		"mistral-medium-latest",
		"mistral-large-latest",
	].filter(Boolean);

	// Use first available model (in production, implement retry logic)
	const model = modelHierarchy[0] || "mistral-small-latest";

	return {
		model: mistralProvider(model as string),
		modelName: model,
		provider: "mistral",
	};
}
