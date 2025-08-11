// API Error Types and Standardized Response Formats

export const API_ERROR_CODES = {
	// Quota-related errors
	QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
	QUOTA_AI_GENERATIONS: "QUOTA_AI_GENERATIONS_EXCEEDED",
	QUOTA_MATERIALS_UPLOAD: "QUOTA_MATERIALS_UPLOAD_EXCEEDED",

	// Rate limiting
	RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

	// General errors
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	NOT_FOUND: "NOT_FOUND",
	VALIDATION_ERROR: "VALIDATION_ERROR",
	INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode =
	(typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

// Standardized API Error Response
export interface ApiErrorResponse {
	error: string; // Human-readable error message
	code: ApiErrorCode; // Machine-readable error code
	details?: {
		// Optional additional context
		[key: string]: unknown;
	};
}

// Quota-specific error response
export interface QuotaExhaustedResponse extends ApiErrorResponse {
	code:
		| "QUOTA_EXCEEDED"
		| "QUOTA_AI_GENERATIONS_EXCEEDED"
		| "QUOTA_MATERIALS_UPLOAD_EXCEEDED";
	details: {
		quotaType: "ai_generations" | "materials_uploaded";
		currentUsage: number;
		quotaLimit: number;
		planId: "free" | "monthly" | "yearly";
		remaining: number; // remaining usage before hitting the limit
		remainingInOtherQuotas?: {
			[key: string]: {
				current: number;
				limit: number;
			};
		};
	};
}

// Rate-limit specific error response
export interface RateLimitExceededResponse extends ApiErrorResponse {
	code: "RATE_LIMIT_EXCEEDED";
	details: {
		limit: number;
		remaining: number;
		resetTime?: number;
		retryAfterSeconds?: number;
	};
}

// Helper function to check if error is quota-related
export function isQuotaError(
	error: ApiErrorResponse
): error is QuotaExhaustedResponse {
	return [
		API_ERROR_CODES.QUOTA_EXCEEDED,
		API_ERROR_CODES.QUOTA_AI_GENERATIONS,
		API_ERROR_CODES.QUOTA_MATERIALS_UPLOAD,
	].includes(error.code as any);
}

// Helper function to check if error is rate-limit related
export function isRateLimitError(
	error: ApiErrorResponse
): error is RateLimitExceededResponse {
	return error.code === API_ERROR_CODES.RATE_LIMIT_EXCEEDED;
}

// Helper function to create standardized quota error response
export function createQuotaErrorResponse(
	quotaType: "ai_generations" | "materials_uploaded",
	currentUsage: number,
	quotaLimit: number,
	planId: "free" | "monthly" | "yearly"
): QuotaExhaustedResponse {
	const quotaTypeMap = {
		ai_generations: API_ERROR_CODES.QUOTA_AI_GENERATIONS,
		materials_uploaded: API_ERROR_CODES.QUOTA_MATERIALS_UPLOAD,
	} as const;

	const actionMap = {
		ai_generations: "AI generation",
		materials_uploaded: "material upload",
	} as const;

	return {
		error: `${actionMap[quotaType]} quota exceeded. You have used ${currentUsage}/${quotaLimit}. Please upgrade your plan.`,
		code: quotaTypeMap[quotaType],
		details: {
			quotaType,
			currentUsage,
			quotaLimit,
			planId,
			remaining: Math.max(0, quotaLimit - currentUsage),
		},
	};
}
