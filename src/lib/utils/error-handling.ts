/**
 * Centralized error handling utility for consistent, user-friendly error messages
 * Following the error handling rules in .cursor/rules/error-handling.mdc
 */
import { logger } from "@/lib/utils/logger";

// Type guard helper for safe property access
const hasProperty = <T extends Record<string, unknown>>(
	obj: unknown,
	prop: keyof T
): obj is T => {
	return typeof obj === "object" && obj !== null && prop in obj;
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
			logger.error(
				{
					err: error,
					operation: operationName,
					timestamp: new Date().toISOString(),
				},
				`Database operation failed: ${operationName}`
			);
		}

		// Always return fallback value to prevent UI crashes
		// UI components can check if they received empty/fallback data
		// and show appropriate error states with retry options
		return fallbackValue;
	}
}
