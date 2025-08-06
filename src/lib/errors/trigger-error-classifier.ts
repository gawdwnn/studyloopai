/**
 * Trigger.dev Error Classification Service
 * Converts technical error messages into user-friendly feedback with actions
 */

export enum ErrorCategory {
	FILE_FORMAT = "file_format",
	FILE_SIZE = "file_size",
	QUOTA_EXCEEDED = "quota_exceeded",
	API_FAILURE = "api_failure",
	NETWORK = "network",
	PROCESSING = "processing",
	SYSTEM = "system",
	UNKNOWN = "unknown",
}

export interface ClassifiedError {
	category: ErrorCategory;
	message: string;
	userMessage: string;
	actionable: boolean;
	suggestedAction?: string;
	retryable: boolean;
	severity: "low" | "medium" | "high" | "critical";
	details?: Record<string, unknown>;
}

export interface TriggerRunError {
	message?: string;
	code?: string;
	stack?: string;
	name?: string;
	[key: string]: unknown;
}

export interface ErrorContext {
	contentType?: string;
	step?: string;
	fileSize?: number;
	[key: string]: unknown;
}

// Centralized error patterns
const ERROR_PATTERNS = {
	fileFormat: [
		"unsupported file",
		"invalid file format",
		"file type not supported",
		"not a valid pdf",
		"corrupted pdf",
		"invalid pdf format",
		"file format error",
	],
	fileSize: [
		"file too large",
		"exceeds maximum size",
		"file size limit",
		"too big to process",
		"maximum file size exceeded",
	],
	quota: [
		"quota exceeded",
		"rate limit",
		"usage limit",
		"billing",
		"insufficient credits",
		"monthly limit",
		"plan limit",
		"exceeded your current quota",
	],
	api: [
		"api error",
		"service unavailable",
		"server error",
		"bad gateway",
		"timeout",
		"connection refused",
		"service timeout",
	],
	network: [
		"network error",
		"connection failed",
		"dns resolution",
		"host unreachable",
		"connection timeout",
		"socket timeout",
	],
	processing: [
		"pdf parsing failed",
		"text extraction",
		"document processing",
		"failed to extract",
		"corrupted document",
		"password protected",
		"unable to read",
		"parsing error",
	],
	system: [
		"database error",
		"internal server error",
		"system failure",
		"infrastructure",
		"deployment error",
		"memory error",
		"disk full",
	],
} as const;

const ERROR_CODES = {
	fileFormat: ["INVALID_FILE_FORMAT", "UNSUPPORTED_FORMAT"],
	quota: [
		"QUOTA_EXCEEDED",
		"RATE_LIMIT_EXCEEDED",
		"INSUFFICIENT_QUOTA",
		"BILLING_LIMIT_REACHED",
	],
	api: ["API_ERROR", "SERVICE_UNAVAILABLE", "TIMEOUT"],
	network: ["NETWORK_ERROR", "CONNECTION_FAILED", "DNS_ERROR"],
	system: ["SYSTEM_ERROR", "DATABASE_ERROR", "INFRASTRUCTURE_ERROR"],
} as const;

const ERROR_NAMES = {
	api: ["APIError", "ServiceError", "TimeoutError"],
} as const;

/**
 * Check if error message matches file format patterns
 */
function isFileFormatError(message: string, code?: string): boolean {
	return (
		ERROR_PATTERNS.fileFormat.some((pattern) => message.includes(pattern)) ||
		Boolean(
			code &&
				ERROR_CODES.fileFormat.includes(
					code as (typeof ERROR_CODES.fileFormat)[number]
				)
		)
	);
}

/**
 * Check if error message matches file size patterns
 */
function isFileSizeError(message: string): boolean {
	return ERROR_PATTERNS.fileSize.some((pattern) => message.includes(pattern));
}

/**
 * Check if error message matches quota patterns
 */
function isQuotaError(message: string, code?: string): boolean {
	return (
		ERROR_PATTERNS.quota.some((pattern) => message.includes(pattern)) ||
		(code
			? ERROR_CODES.quota.includes(code as (typeof ERROR_CODES.quota)[number])
			: false)
	);
}

/**
 * Check if error message matches API failure patterns
 */
function isAPIFailure(message: string, code?: string, name?: string): boolean {
	return (
		ERROR_PATTERNS.api.some((pattern) => message.includes(pattern)) ||
		(code
			? ERROR_CODES.api.includes(code as (typeof ERROR_CODES.api)[number])
			: false) ||
		(name
			? ERROR_NAMES.api.includes(name as (typeof ERROR_NAMES.api)[number])
			: false)
	);
}

/**
 * Check if error message matches network patterns
 */
function isNetworkError(message: string, code?: string): boolean {
	return (
		ERROR_PATTERNS.network.some((pattern) => message.includes(pattern)) ||
		(code
			? ERROR_CODES.network.includes(
					code as (typeof ERROR_CODES.network)[number]
				)
			: false)
	);
}

/**
 * Check if error message matches processing patterns
 */
function isProcessingError(message: string, context?: ErrorContext): boolean {
	return (
		ERROR_PATTERNS.processing.some((pattern) => message.includes(pattern)) ||
		context?.step?.includes("processing") === true
	);
}

/**
 * Check if error message matches system patterns
 */
function isSystemError(message: string, code?: string): boolean {
	return (
		ERROR_PATTERNS.system.some((pattern) => message.includes(pattern)) ||
		(code
			? ERROR_CODES.system.includes(code as (typeof ERROR_CODES.system)[number])
			: false)
	);
}

/**
 * Classify Trigger.dev run error into user-friendly categories
 */
export function classifyTriggerError(
	runError: TriggerRunError | null | undefined,
	context?: ErrorContext
): ClassifiedError | null {
	if (!runError) return null;

	const errorMessage = (runError.message || "").toLowerCase();
	const errorCode = runError.code;
	const errorName = runError.name;

	// File format errors
	if (isFileFormatError(errorMessage, errorCode)) {
		return {
			category: ErrorCategory.FILE_FORMAT,
			message: runError.message || "File format error",
			userMessage:
				"This file format is not supported. Please upload a PDF file.",
			actionable: true,
			suggestedAction: "Upload a different file in PDF format",
			retryable: false,
			severity: "medium",
			details: { fileType: context?.contentType },
		};
	}

	// File size errors
	if (isFileSizeError(errorMessage)) {
		return {
			category: ErrorCategory.FILE_SIZE,
			message: runError.message || "File size error",
			userMessage:
				"File is too large for processing. Please upload a smaller file (max 10MB).",
			actionable: true,
			suggestedAction: "Split large files into smaller sections or compress",
			retryable: false,
			severity: "medium",
		};
	}

	// Quota exhaustion errors
	if (isQuotaError(errorMessage, errorCode)) {
		return {
			category: ErrorCategory.QUOTA_EXCEEDED,
			message: runError.message || "Quota exceeded",
			userMessage: "You've reached your processing limit for this period.",
			actionable: true,
			suggestedAction: "Upgrade your plan or wait for quota reset",
			retryable: true,
			severity: "high",
		};
	}

	// API service failures
	if (isAPIFailure(errorMessage, errorCode, errorName)) {
		return {
			category: ErrorCategory.API_FAILURE,
			message: runError.message || "API failure",
			userMessage: "AI service is temporarily unavailable.",
			actionable: false,
			suggestedAction: "We're retrying automatically. No action needed.",
			retryable: true,
			severity: "medium",
		};
	}

	// Network errors
	if (isNetworkError(errorMessage, errorCode)) {
		return {
			category: ErrorCategory.NETWORK,
			message: runError.message || "Network error",
			userMessage: "Connection issue detected.",
			actionable: false,
			suggestedAction: "Check your internet connection and try again",
			retryable: true,
			severity: "medium",
		};
	}

	// Processing errors (PDF parsing, text extraction, etc.)
	if (isProcessingError(errorMessage, context)) {
		return {
			category: ErrorCategory.PROCESSING,
			message: runError.message || "Processing error",
			userMessage:
				"Unable to process this file. It may be corrupted or password-protected.",
			actionable: true,
			suggestedAction: "Try a different file or remove password protection",
			retryable: false,
			severity: "medium",
		};
	}

	// System errors (infrastructure, database, etc.)
	if (isSystemError(errorMessage, errorCode)) {
		return {
			category: ErrorCategory.SYSTEM,
			message: runError.message || "System error",
			userMessage: "A system error occurred. Our team has been notified.",
			actionable: false,
			suggestedAction: "Please try again in a few minutes",
			retryable: true,
			severity: "critical",
		};
	}

	// Default classification for unknown errors
	return {
		category: ErrorCategory.UNKNOWN,
		message: runError.message || "Unknown error",
		userMessage: "An unexpected error occurred.",
		actionable: false,
		suggestedAction: "Please try again or contact support if this persists",
		retryable: true,
		severity: "medium",
	};
}

/**
 * Get user-friendly error message with fallback
 */
export function getTriggerErrorMessage(
	runError: TriggerRunError | null | undefined
): string {
	const classified = classifyTriggerError(runError);
	return (
		classified?.userMessage ||
		"An error occurred during processing. Please try again."
	);
}

/**
 * Check if error is retryable
 */
export function isTriggerErrorRetryable(
	runError: TriggerRunError | null | undefined
): boolean {
	const classified = classifyTriggerError(runError);
	return classified?.retryable ?? true;
}

/**
 * Check if error is user-actionable
 */
export function isTriggerErrorActionable(
	runError: TriggerRunError | null | undefined
): boolean {
	const classified = classifyTriggerError(runError);
	return classified?.actionable ?? false;
}

// Backward compatibility - keep the class interface but delegate to functions
export const TriggerErrorClassifier = {
	classify: classifyTriggerError,
	getUserMessage: getTriggerErrorMessage,
	isRetryable: isTriggerErrorRetryable,
	isActionable: isTriggerErrorActionable,
} as const;
