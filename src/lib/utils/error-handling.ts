/**
 * Database error handling utilities
 */

export class DatabaseError extends Error {
	constructor(
		message: string,
		public readonly operation: string,
		public readonly originalError?: unknown
	) {
		super(message);
		this.name = "DatabaseError";
	}
}

export class ConnectionError extends DatabaseError {
	constructor(operation: string, originalError?: unknown) {
		super(
			"Unable to connect to the database. Please check your connection and try again.",
			operation,
			originalError
		);
		this.name = "ConnectionError";
	}
}

/**
 * Wrapper for database operations that provides consistent error handling
 */
export async function withErrorHandling<T>(
	operation: () => Promise<T>,
	operationName: string,
	fallbackValue: T
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		console.error(`Database operation failed: ${operationName}`, error);

		// Check if it's a connection error
		if (
			error instanceof Error &&
			(error.message.includes("ENOTFOUND") ||
				error.message.includes("ECONNREFUSED") ||
				error.message.includes("getaddrinfo"))
		) {
			throw new ConnectionError(operationName, error);
		}

		// For other database errors, return fallback value
		return fallbackValue;
	}
}

/**
 * Retry mechanism for database operations
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	maxRetries = 3,
	delay = 1000
): Promise<T> {
	let lastError: Error = new Error("No attempts made");

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error as Error;

			if (attempt === maxRetries) {
				throw lastError;
			}

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, delay * attempt));
		}
	}

	throw lastError;
}

/**
 * Check if an error is a database connection error
 */
export function isConnectionError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;

	return (
		error.message.includes("ENOTFOUND") ||
		error.message.includes("ECONNREFUSED") ||
		error.message.includes("getaddrinfo") ||
		error.message.includes("Connection terminated") ||
		error.message.includes("Connection closed")
	);
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: unknown): string {
	if (error instanceof ConnectionError) {
		return "Unable to connect to the database. Please check your internet connection and try again.";
	}

	if (error instanceof DatabaseError) {
		return `Database error: ${error.message}`;
	}

	if (error instanceof Error) {
		// Don't expose internal error details to users in production
		if (process.env.NODE_ENV === "development") {
			return error.message;
		}
		return "An unexpected error occurred. Please try again.";
	}

	return "An unexpected error occurred. Please try again.";
}
