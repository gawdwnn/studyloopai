import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";

/**
 * AI SDK Configuration for StudyLoop AI
 * Cost-optimized: Free xAI via Vercel for text generation, OpenAI only for embeddings
 */

// Environment variable validation
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Note: xAI is FREE on Vercel Hobby tier - no API key needed!

if (!OPENAI_API_KEY) {
	console.warn(
		"OPENAI_API_KEY not found. Embedding generation will not be available. " +
			"Text generation will use free xAI via Vercel."
	);
}

// Provider instances
// xAI is FREE on Vercel Hobby tier - prioritize this for cost savings
const xaiProvider = xai; // No API key needed on Vercel
const openaiProvider = OPENAI_API_KEY ? openai : null;

// Model configurations - prioritize cost-effective options
export const models = {
	// Text generation models - prioritize FREE xAI
	textGeneration: {
		primary: "grok-beta", // FREE on Vercel Hobby tier
		fallback: openaiProvider ? "gpt-4o-mini" : null, // Only if OpenAI available
	},

	// Embedding models - OpenAI required (most cost-effective embedding model)
	embeddings: {
		primary: "text-embedding-3-small", // Most cost-effective OpenAI embedding
		dimensions: 1536,
	},
} as const;

// Get the primary provider instance for text generation (prioritize FREE xAI)
export function getTextGenerationModel() {
	// Always prioritize FREE xAI on Vercel
	return xaiProvider(models.textGeneration.primary);
}

// Get embedding model (requires OpenAI - but only used when needed)
export function getEmbeddingModel() {
	if (!openaiProvider) {
		throw new Error(
			"OpenAI API key required for embeddings. Add OPENAI_API_KEY to environment variables."
		);
	}
	return openaiProvider(models.embeddings.primary);
}

// Legacy compatibility functions
export const getPrimaryProvider = () => {
	// Prioritize FREE xAI, fallback to OpenAI if needed
	return xaiProvider;
};

export const getModel = (task: "textGeneration" | "embeddings") => {
	if (task === "textGeneration") {
		return getTextGenerationModel();
	}

	if (task === "embeddings") {
		return getEmbeddingModel();
	}

	throw new Error(`Unknown task: ${task}`);
};

// Configuration for different content types - optimized for cost-effective generation
export const contentGenerationConfig = {
	goldenNotes: {
		maxTokens: 1500, // Reduced from 2000 for cost optimization
		temperature: 0.7,
		systemPrompt:
			"You are an expert educational content creator. Generate concise, well-structured golden notes that highlight the most important concepts from the provided material.",
	},

	summary: {
		maxTokens: 800, // Reduced from 1000 for cost optimization
		temperature: 0.5,
		systemPrompt:
			"You are an expert educational content summarizer. Create clear, comprehensive summaries that capture the key points and main ideas from the provided material.",
	},

	topicOverview: {
		maxTokens: 1200, // Reduced from 1500 for cost optimization
		temperature: 0.6,
		systemPrompt:
			"You are an expert educational content analyzer. Provide a comprehensive topic overview that explains the main themes and learning objectives from the provided material.",
	},
} as const;

// Processing timeouts and limits - optimized for cost-effective processing
export const processingLimits = {
	maxRetries: 2, // Reduced from 3 to minimize costs
	timeout: 45000, // Reduced from 60 seconds for faster processing
	chunkTimeout: 8000, // Reduced from 10 seconds
	maxConcurrentChunks: 3, // Reduced from 5 to control costs
} as const;

// Cost optimization settings
export const costOptimization = {
	// Use smaller chunks to reduce token usage
	preferredChunkSize: 800, // Smaller than default 1000
	preferredOverlapSize: 150, // Smaller than default 200

	// Batch processing settings for embeddings (when needed)
	embeddingBatchSize: 10, // Process embeddings in batches

	// Rate limiting to stay within free tiers
	requestsPerMinute: 30, // Conservative rate limiting
} as const;
