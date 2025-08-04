/**
 * Centralized error handling utility for consistent, user-friendly error messages
 * Following the error handling rules in .cursor/rules/error-handling.mdc
 */
// TODO: clean up this file

import { logger } from "@/lib/utils/logger";

export enum ErrorType {
	NETWORK = "network",
	VALIDATION = "validation",
	PERMISSION = "permission",
	NOT_FOUND = "not_found",
	SERVER = "server",
	AUTHENTICATION = "authentication",
	RATE_LIMIT = "rate_limit",
	UNKNOWN = "unknown",
}

export interface StructuredError {
	type: ErrorType;
	message: string;
	userMessage: string;
	code?: string;
	details?: Record<string, unknown>;
}

// Type guard helper for safe property access
const hasProperty = <T extends Record<string, unknown>>(
	obj: unknown,
	prop: keyof T
): obj is T => {
	return typeof obj === "object" && obj !== null && prop in obj;
};

// Type guards for different error types
export const isNetworkError = (error: unknown): boolean => {
	return (
		error instanceof TypeError ||
		(error instanceof Error && error.message.includes("fetch")) ||
		(error instanceof Error && error.message.includes("network"))
	);
};

export const isValidationError = (error: unknown): boolean => {
	return (
		(hasProperty(error, "name") && error.name === "ValidationError") ||
		(hasProperty(error, "code") && error.code === "VALIDATION_ERROR") ||
		(hasProperty(error, "status") && error.status === 422)
	);
};

export const isPermissionError = (error: unknown): boolean => {
	return (
		(hasProperty(error, "status") && error.status === 403) ||
		(hasProperty(error, "code") && error.code === "PERMISSION_DENIED") ||
		(hasProperty(error, "message") &&
			typeof error.message === "string" &&
			error.message.includes("permission"))
	);
};

export const isAuthenticationError = (error: unknown): boolean => {
	return (
		(hasProperty(error, "status") && error.status === 401) ||
		(hasProperty(error, "code") && error.code === "UNAUTHENTICATED") ||
		(hasProperty(error, "message") &&
			typeof error.message === "string" &&
			error.message.includes("unauthorized"))
	);
};

export const isNotFoundError = (error: unknown): boolean => {
	return (
		(hasProperty(error, "status") && error.status === 404) ||
		(hasProperty(error, "code") && error.code === "NOT_FOUND") ||
		(hasProperty(error, "message") &&
			typeof error.message === "string" &&
			error.message.includes("not found"))
	);
};

interface RateLimitError extends Error {
	remainingAttempts?: number;
	resetTime?: number;
}

export const isRateLimitError = (error: unknown): error is RateLimitError => {
	return (
		(hasProperty(error, "status") && error.status === 429) ||
		(hasProperty(error, "code") && error.code === "RATE_LIMIT_EXCEEDED") ||
		(hasProperty(error, "message") &&
			typeof error.message === "string" &&
			error.message.includes("rate limit"))
	);
};

/**
 * Main error handling function that converts any error into a user-friendly message
 * @param error - The error object or unknown error
 * @param operation - Description of what operation failed (e.g., "save note", "load courses")
 * @returns User-friendly error message
 */
export const handleApiError = (error: unknown, operation: string): string => {
	// Log the full error for debugging (server-side only in production)
	if (process.env.NODE_ENV === "development") {
		logger.error(`${operation} failed`, {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			operation,
		});
	}

	// Network errors
	if (isNetworkError(error)) {
		return "Please check your internet connection and try again";
	}

	// Authentication errors
	if (isAuthenticationError(error)) {
		return "Please sign in again to continue";
	}

	// Permission errors
	if (isPermissionError(error)) {
		return `You don't have permission to ${operation}`;
	}

	// Not found errors
	if (isNotFoundError(error)) {
		return "The requested item could not be found. It may have been deleted.";
	}

	// Rate limit errors
	if (isRateLimitError(error)) {
		return "Too many requests. Please wait a moment and try again.";
	}

	// Validation errors with custom messages
	if (isValidationError(error)) {
		const userMessage = hasProperty(error, "userMessage")
			? error.userMessage
			: null;
		const message = hasProperty(error, "message") ? error.message : null;
		const customMessage = userMessage || message;

		if (customMessage && typeof customMessage === "string") {
			return customMessage;
		}
		return "Please check your input and try again";
	}

	// Structured errors from our own server actions
	if (
		hasProperty(error, "userMessage") &&
		typeof error.userMessage === "string"
	) {
		return error.userMessage;
	}

	// Server errors (5xx)
	if (
		hasProperty(error, "status") &&
		typeof error.status === "number" &&
		error.status >= 500
	) {
		return `Unable to ${operation} due to a server issue. Please try again later.`;
	}

	// Fallback for unknown errors - always provide context
	return `Unable to ${operation}. Please try again.`;
};

/**
 * Enhanced error handler for React Query mutations
 * @param error - The mutation error
 * @param operation - Description of the operation
 * @param onRetry - Optional retry function
 * @returns Formatted error object with message and retry option
 */
export const handleMutationError = (
	error: unknown,
	operation: string,
	onRetry?: () => void
) => {
	const message = handleApiError(error, operation);

	return {
		message,
		canRetry:
			isNetworkError(error) ||
			(hasProperty(error, "status") &&
				typeof error.status === "number" &&
				error.status >= 500),
		retry: onRetry,
	};
};

/**
 * Creates user-friendly error messages for specific operations
 */
export const getOperationErrorMessage = (
	operation: string,
	error: unknown
): string => {
	const baseMessage = handleApiError(error, operation);

	// Add operation-specific context
	switch (operation) {
		case "save note":
			return isNetworkError(error)
				? "Unable to save note. Your changes were not saved. Please check your connection."
				: baseMessage;

		case "delete note":
			return isPermissionError(error)
				? "You don't have permission to delete this note"
				: baseMessage;

		case "load notes":
			return isNetworkError(error)
				? "Unable to load notes. Please check your connection and refresh."
				: baseMessage;

		case "load courses":
			return isNetworkError(error)
				? "Unable to load your courses. Please check your connection."
				: baseMessage;

		case "upload file":
			if (hasProperty(error, "code")) {
				if (error.code === "FILE_TOO_LARGE") {
					return "File size too large. Please upload a file smaller than 10MB.";
				}
				if (error.code === "INVALID_FILE_TYPE") {
					return "File type not supported. Please upload a PDF or image file.";
				}
			}
			return baseMessage;

		default:
			return baseMessage;
	}
};

/**
 * Error boundary fallback component props
 */
export interface ErrorFallbackProps {
	error: Error;
	resetError: () => void;
	operation?: string;
}

/**
 * Determines if an error should trigger a retry mechanism
 */
export const shouldShowRetry = (error: unknown): boolean => {
	return (
		isNetworkError(error) ||
		(hasProperty(error, "status") &&
			typeof error.status === "number" &&
			error.status >= 500) ||
		isRateLimitError(error)
	);
};

/**
 * Gets appropriate retry delay based on error type
 */
export const getRetryDelay = (
	error: unknown,
	attemptNumber: number
): number => {
	if (isRateLimitError(error)) {
		return 60000; // 1 minute for rate limits
	}

	if (isNetworkError(error)) {
		return Math.min(1000 * 2 ** attemptNumber, 10000); // Exponential backoff up to 10s
	}

	return 3000; // Default 3 second delay
};

/**
 * Creates a structured error response for server actions
 */
export const createErrorResponse = (
	error: unknown,
	operation: string
): { success: false; error: string; code?: string } => {
	return {
		success: false,
		error: getOperationErrorMessage(operation, error),
		code:
			hasProperty(error, "code") && typeof error.code === "string"
				? error.code
				: undefined,
	};
};

/**
 * Creates a success response for server actions
 */
export const createSuccessResponse = <T>(
	data: T
): { success: true; data: T } => {
	return {
		success: true,
		data,
	};
};

/**
 * Higher-order function that wraps async operations with comprehensive error handling
 * Always returns fallback values instead of throwing errors to prevent UI crashes
 *
 * @param operation - The async operation to execute
 * @param operationName - Name of the operation for logging and error messages
 * @param fallbackValue - Value to return if the operation fails
 * @returns Promise that resolves to either the operation result or fallback value
 */
export async function withErrorHandling<T>(
	operation: () => Promise<T>,
	operationName: string,
	fallbackValue: T
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		// Use centralized error logging
		if (process.env.NODE_ENV === "development") {
			logger.error(`Database operation failed: ${operationName}`, {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				operation: operationName,
				timestamp: new Date().toISOString(),
			});
		}

		// Always return fallback value to prevent UI crashes
		// UI components can check if they received empty/fallback data
		// and show appropriate error states with retry options
		return fallbackValue;
	}
}

/**
 * Utility to determine if a returned value is likely a fallback due to an error
 * This helps UI components decide whether to show error states
 */
export const isFallbackValue = <T>(value: T, fallbackValue: T): boolean => {
	// For arrays, check if empty and fallback is also empty
	if (Array.isArray(value) && Array.isArray(fallbackValue)) {
		return value.length === 0 && fallbackValue.length === 0;
	}

	// For objects, do shallow comparison
	if (
		typeof value === "object" &&
		value !== null &&
		typeof fallbackValue === "object" &&
		fallbackValue !== null
	) {
		return JSON.stringify(value) === JSON.stringify(fallbackValue);
	}

	// For primitives, direct comparison
	return value === fallbackValue;
};
