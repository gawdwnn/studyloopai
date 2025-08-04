/**
 * AI-specific error types for better error handling and debugging
 */

/**
 * Base error class for all AI-related errors
 */
export class AIError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, unknown>
	) {
		super(message);
		this.name = "AIError";
	}
}

/**
 * Error thrown when embedding generation fails
 */
export class EmbeddingError extends AIError {
	constructor(
		message: string,
		public readonly model?: string,
		public readonly textsCount?: number,
		context?: Record<string, unknown>
	) {
		super(message, "EMBEDDING_ERROR", {
			...context,
			model,
			textsCount,
		});
		this.name = "EmbeddingError";
	}
}

/**
 * Error thrown when rate limits are exceeded
 */
export class RateLimitError extends AIError {
	constructor(
		message: string,
		public readonly retryAfter?: number,
		public readonly model?: string,
		context?: Record<string, unknown>
	) {
		super(message, "RATE_LIMIT_ERROR", {
			...context,
			retryAfter,
			model,
		});
		this.name = "RateLimitError";
	}
}

/**
 * Error thrown when API quota/credits are exhausted
 */
export class QuotaExhaustedError extends AIError {
	constructor(
		message: string,
		public readonly provider: "openai" | "xai",
		public readonly model?: string,
		public readonly requiresBilling?: boolean,
		context?: Record<string, unknown>
	) {
		super(message, "QUOTA_EXHAUSTED_ERROR", {
			...context,
			provider,
			model,
			requiresBilling,
		});
		this.name = "QuotaExhaustedError";
	}
}

/**
 * Error thrown when vector search fails
 */
export class VectorSearchError extends AIError {
	constructor(
		message: string,
		public readonly query?: string,
		public readonly searchType?: "vector" | "hybrid" | "similarity",
		context?: Record<string, unknown>
	) {
		super(message, "VECTOR_SEARCH_ERROR", {
			...context,
			query,
			searchType,
		});
		this.name = "VectorSearchError";
	}
}

/**
 * Error thrown when model is not available
 */
export class ModelNotAvailableError extends AIError {
	constructor(
		message: string,
		public readonly requestedModel: string,
		public readonly availableModels?: string[],
		context?: Record<string, unknown>
	) {
		super(message, "MODEL_NOT_AVAILABLE", {
			...context,
			requestedModel,
			availableModels,
		});
		this.name = "ModelNotAvailableError";
	}
}

/**
 * Helper to determine if an error is rate limit related
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
	if (error instanceof RateLimitError) return true;

	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			message.includes("rate limit") ||
			message.includes("429") ||
			message.includes("too many requests")
		);
	}

	return false;
}

/**
 * Helper to determine if an error is quota exhaustion related (requires billing action)
 * Supports both OpenAI and xAI error patterns
 */
export function isQuotaExhaustedError(
	error: unknown
): error is QuotaExhaustedError {
	if (error instanceof QuotaExhaustedError) return true;

	if (error instanceof Error) {
		const message = error.message.toLowerCase();

		// OpenAI quota exhaustion patterns
		const hasOpenAIQuotaPattern =
			message.includes("exceeded your current quota") ||
			message.includes("insufficient_quota") ||
			message.includes("check your plan and billing details") ||
			message.includes("current quota") ||
			message.includes("billing details");

		// xAI quota exhaustion patterns (similar to OpenAI due to compatibility)
		const hasXAIQuotaPattern =
			message.includes("quota exceeded") ||
			message.includes("credit exhausted") ||
			message.includes("monthly limit") ||
			message.includes("token limit exceeded");

		// Check if it's explicitly quota and not just rate limiting
		const isQuotaNotRateLimit =
			!message.includes("retry-after") && !message.includes("requests per");

		return (hasOpenAIQuotaPattern || hasXAIQuotaPattern) && isQuotaNotRateLimit;
	}

	// Check for structured error response (OpenAI format)
	if (typeof error === "object" && error !== null) {
		const errorObj = error as Record<string, unknown>;
		const errorDetails = errorObj.error as Record<string, unknown> | undefined;

		// OpenAI structured error format
		if (
			errorDetails?.type === "insufficient_quota" ||
			errorDetails?.code === "insufficient_quota"
		) {
			return true;
		}

		// HTTP status 429 with quota-specific message
		if (errorObj.status === 429 && errorObj.message) {
			const message = String(errorObj.message).toLowerCase();
			return message.includes("quota") || message.includes("billing");
		}
	}

	return false;
}

/**
 * Determine the provider from error context
 */
export function getProviderFromError(
	error: unknown
): "openai" | "xai" | "unknown" {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();

		// OpenAI specific patterns
		if (
			message.includes("openai") ||
			message.includes("exceeded your current quota") ||
			message.includes("insufficient_quota")
		) {
			return "openai";
		}

		// xAI specific patterns
		if (
			message.includes("xai") ||
			message.includes("grok") ||
			message.includes("x.ai")
		) {
			return "xai";
		}
	}

	return "unknown";
}

/**
 * Helper to extract retry delay from error
 */
export function getRetryDelay(error: unknown): number | null {
	if (error instanceof RateLimitError && error.retryAfter) {
		return error.retryAfter;
	}

	// Try to extract from error message or headers
	if (error instanceof Error) {
		const match = error.message.match(/retry[- ]?after[:\s]+(\d+)/i);
		if (match) {
			return Number.parseInt(match[1], 10) * 1000; // Convert to ms
		}
	}

	return null;
}
