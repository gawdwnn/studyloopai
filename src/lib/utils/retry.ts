export interface RetryOptions {
	maxAttempts?: number;
	baseDelay?: number;
	maxDelay?: number;
	backoffFactor?: number;
	shouldRetry?: (error: Error) => boolean;
}

export interface RetryResult<T> {
	success: boolean;
	data?: T;
	error?: Error;
	attempts: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxAttempts: 3,
	baseDelay: 1000, // 1 second
	maxDelay: 30000, // 30 seconds
	backoffFactor: 2,
	shouldRetry: (error: Error) => {
		// Retry on network errors, timeouts, and 5xx server errors
		const retryableErrors = ["NetworkError", "TimeoutError", "AbortError", "fetch"];

		return (
			retryableErrors.some(
				(errorType) =>
					error.name.includes(errorType) ||
					error.message.toLowerCase().includes(errorType.toLowerCase())
			) ||
			(error.message.includes("5") && error.message.includes("0"))
		); // 5xx errors
	},
};

/**
 * Executes a function with exponential backoff retry logic
 * Automatically retries on network failures and server errors
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	options: RetryOptions = {}
): Promise<RetryResult<T>> {
	const config = { ...DEFAULT_OPTIONS, ...options };
	let lastError: Error = new Error("No attempts made");

	for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
		try {
			console.log(`Retry attempt ${attempt}/${config.maxAttempts}`);
			const result = await operation();

			return {
				success: true,
				data: result,
				attempts: attempt,
			};
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			console.warn(`Attempt ${attempt} failed:`, lastError.message);

			// Don't retry if this is the last attempt or error is not retryable
			if (attempt === config.maxAttempts || !config.shouldRetry(lastError)) {
				break;
			}

			// Calculate delay with exponential backoff and jitter
			const baseDelay = config.baseDelay * config.backoffFactor ** (attempt - 1);
			const jitter = Math.random() * 0.1 * baseDelay; // Add 10% jitter
			const delay = Math.min(baseDelay + jitter, config.maxDelay);

			console.log(`Retrying in ${Math.round(delay)}ms...`);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	return {
		success: false,
		error: lastError,
		attempts: config.maxAttempts,
	};
}

/**
 * Enhanced fetch with automatic retry logic
 * Provides network resilience for API calls
 */
export async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
	retryOptions: RetryOptions = {}
): Promise<Response> {
	const result = await withRetry(async () => {
		const response = await fetch(url, {
			...options,
			// Add timeout to prevent hanging requests
			signal: AbortSignal.timeout(30000), // 30 second timeout
		});

		// Throw error for non-ok responses to trigger retry logic
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return response;
	}, retryOptions);

	if (!result.success || !result.data) {
		throw result.error || new Error("Fetch failed after retries");
	}

	return result.data;
}
