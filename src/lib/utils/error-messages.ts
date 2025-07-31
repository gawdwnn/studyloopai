/**
 * Centralized error message classification and user-friendly message generation
 * Prevents raw server errors from being displayed to users
 */

import { logger } from "@/lib/utils/logger";

export interface ErrorClassification {
	type:
		| "validation"
		| "constraint"
		| "network"
		| "file"
		| "auth"
		| "quota"
		| "server"
		| "unknown";
	userMessage: string;
	actionable: boolean;
	retryable: boolean;
}

/**
 * Classifies error and returns user-friendly message with metadata
 */
export function classifyError(error: Error | string): ErrorClassification {
	const message = typeof error === "string" ? error : error.message;
	const lowerMessage = message.toLowerCase();

	// Database constraint violations
	if (
		lowerMessage.includes("unique constraint") ||
		lowerMessage.includes("already exists") ||
		lowerMessage.includes("duplicate key")
	) {
		return {
			type: "constraint",
			userMessage:
				"This week already has materials uploaded. Please select a different week.",
			actionable: true,
			retryable: false,
		};
	}

	// File-related errors
	if (
		lowerMessage.includes("file too large") ||
		lowerMessage.includes("exceeds maximum size")
	) {
		return {
			type: "file",
			userMessage:
				"File size exceeds the 10MB limit. Please choose a smaller file.",
			actionable: true,
			retryable: false,
		};
	}

	if (
		lowerMessage.includes("invalid file type") ||
		lowerMessage.includes("unsupported format") ||
		lowerMessage.includes("only pdf")
	) {
		return {
			type: "file",
			userMessage: "Only PDF files are supported. Please upload a PDF file.",
			actionable: true,
			retryable: false,
		};
	}

	if (
		lowerMessage.includes("no files") ||
		lowerMessage.includes("empty file")
	) {
		return {
			type: "validation",
			userMessage: "Please select at least one file to upload.",
			actionable: true,
			retryable: false,
		};
	}

	// Authentication errors
	if (
		lowerMessage.includes("unauthorized") ||
		lowerMessage.includes("unauthenticated") ||
		lowerMessage.includes("permission denied") ||
		lowerMessage.includes("access denied")
	) {
		return {
			type: "auth",
			userMessage: "Session expired. Please refresh the page and try again.",
			actionable: true,
			retryable: true,
		};
	}

	// Network/connection errors
	if (
		lowerMessage.includes("network") ||
		lowerMessage.includes("fetch") ||
		lowerMessage.includes("connection") ||
		lowerMessage.includes("timeout") ||
		lowerMessage.includes("offline")
	) {
		return {
			type: "network",
			userMessage:
				"Connection issue. Please check your internet and try again.",
			actionable: true,
			retryable: true,
		};
	}

	// Quota/rate limiting
	if (
		lowerMessage.includes("rate limit") ||
		lowerMessage.includes("quota exceeded") ||
		lowerMessage.includes("too many requests")
	) {
		return {
			type: "quota",
			userMessage: "Too many requests. Please wait a moment and try again.",
			actionable: true,
			retryable: true,
		};
	}

	// Validation errors
	if (
		lowerMessage.includes("validation") ||
		lowerMessage.includes("required") ||
		lowerMessage.includes("invalid") ||
		lowerMessage.includes("missing")
	) {
		return {
			type: "validation",
			userMessage: "Please check your input and try again.",
			actionable: true,
			retryable: false,
		};
	}

	// Server errors
	if (
		lowerMessage.includes("internal server error") ||
		lowerMessage.includes("500") ||
		lowerMessage.includes("service unavailable")
	) {
		return {
			type: "server",
			userMessage:
				"Service temporarily unavailable. Please try again in a few moments.",
			actionable: true,
			retryable: true,
		};
	}

	// Fallback for unknown errors
	return {
		type: "unknown",
		userMessage:
			"Something went wrong. Please try again or contact support if the problem persists.",
		actionable: true,
		retryable: true,
	};
}

/**
 * Gets user-friendly error message from error object
 */
export function getUserFriendlyErrorMessage(error: Error | string): string {
	return classifyError(error).userMessage;
}

/**
 * Determines if an error is retryable by the user
 */
export function isRetryableError(error: Error | string): boolean {
	return classifyError(error).retryable;
}

/**
 * Logs error details for debugging while returning user-friendly message
 */
export function handleErrorWithLogging(
	error: Error | string,
	context: string,
	additionalInfo?: Record<string, unknown>
): string {
	const classification = classifyError(error);

	// Log full error details for debugging (only in development or server-side)
	if (typeof window === "undefined" || process.env.NODE_ENV === "development") {
		logger.error(`[${context}] ${classification.type.toUpperCase()} Error`, {
			message:
				typeof error === "string"
					? error
					: error instanceof Error
						? error.message
						: String(error),
			stack: error instanceof Error ? error.stack : undefined,
			classification,
			context,
			...additionalInfo,
		});
	}

	return classification.userMessage;
}

/**
 * Specific error messages for upload operations
 */
export const UPLOAD_ERROR_MESSAGES = {
	WEEK_HAS_MATERIALS:
		"This week already has materials uploaded. Please select a different week.",
	FILE_TOO_LARGE:
		"File size exceeds the 10MB limit. Please choose a smaller file.",
	INVALID_FILE_TYPE: "Only PDF files are supported. Please upload a PDF file.",
	NO_FILES_SELECTED: "Please select at least one file to upload.",
	UPLOAD_FAILED: "Upload failed. Please check your file and try again.",
	PROCESSING_FAILED:
		"Files uploaded successfully but processing failed to start. We'll retry automatically.",
	CONNECTION_ERROR:
		"Connection issue. Please check your internet and try again.",
	SESSION_EXPIRED: "Session expired. Please refresh the page and try again.",
	SERVER_ERROR:
		"Service temporarily unavailable. Please try again in a few moments.",
	UNKNOWN_ERROR:
		"Something went wrong. Please try again or contact support if the problem persists.",
} as const;

/**
 * Maps common error patterns to specific upload messages
 */
export function getUploadErrorMessage(error: Error | string): string {
	const message = typeof error === "string" ? error : error.message;
	const lowerMessage = message.toLowerCase();

	if (
		lowerMessage.includes("unique constraint") ||
		lowerMessage.includes("already exists")
	) {
		return UPLOAD_ERROR_MESSAGES.WEEK_HAS_MATERIALS;
	}

	if (lowerMessage.includes("file too large")) {
		return UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE;
	}

	if (
		lowerMessage.includes("invalid file type") ||
		lowerMessage.includes("only pdf")
	) {
		return UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE;
	}

	if (lowerMessage.includes("no files") || lowerMessage.includes("empty")) {
		return UPLOAD_ERROR_MESSAGES.NO_FILES_SELECTED;
	}

	if (
		lowerMessage.includes("unauthorized") ||
		lowerMessage.includes("unauthenticated")
	) {
		return UPLOAD_ERROR_MESSAGES.SESSION_EXPIRED;
	}

	if (
		lowerMessage.includes("network") ||
		lowerMessage.includes("connection") ||
		lowerMessage.includes("fetch")
	) {
		return UPLOAD_ERROR_MESSAGES.CONNECTION_ERROR;
	}

	if (lowerMessage.includes("server error") || lowerMessage.includes("500")) {
		return UPLOAD_ERROR_MESSAGES.SERVER_ERROR;
	}

	return UPLOAD_ERROR_MESSAGES.UNKNOWN_ERROR;
}
