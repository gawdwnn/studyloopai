import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";

const xaiProvider = process.env.XAI_API_KEY ? createXai({ apiKey: process.env.XAI_API_KEY }) : null;

const openaiProvider = process.env.OPENAI_API_KEY
	? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
	: null;

export function getTextGenerationModel() {
	if (xaiProvider) return xaiProvider("grok-3");
	if (openaiProvider) return openaiProvider("gpt-4o-mini");
	throw new Error("No AI provider available. Set XAI_API_KEY or OPENAI_API_KEY.");
}

export function getEmbeddingModel() {
	if (!openaiProvider) {
		throw new Error("OpenAI API key required for embeddings. Set OPENAI_API_KEY.");
	}
	return openaiProvider.textEmbeddingModel("text-embedding-3-small");
}
