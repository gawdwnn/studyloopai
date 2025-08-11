/**
 * Frontend API Error Handler for Quota and General Error Management
 * Provides standardized error handling with toast notifications
 */

import type {
	ApiErrorCode,
	ApiErrorResponse,
	QuotaExhaustedResponse,
	RateLimitExceededResponse,
} from "@/lib/types/api-errors";
import { isQuotaError, isRateLimitError } from "@/lib/types/api-errors";
import { toast } from "sonner";

// Generic API response type for error handling
export interface ApiResponse<T = unknown> {
	success?: boolean;
	error?: string;
	code?: ApiErrorCode;
	details?: unknown;
	data?: T;
}

// Helper function to extract error response from various Response formats
export async function extractErrorFromResponse(
	response: Response
): Promise<ApiErrorResponse | null> {
	try {
		const contentType = response.headers.get("content-type");

		if (contentType?.includes("application/json")) {
			const errorData = await response.json();

			// Check if it matches our standardized error format
			if (errorData.error && errorData.code) {
				return errorData as ApiErrorResponse;
			}

			// Handle legacy error formats
			if (errorData.error) {
				return {
					error: errorData.error,
					code: "INTERNAL_ERROR", // Default fallback
					details: errorData.details || {},
				};
			}
		}

		// Fallback for non-JSON responses
		const errorText = await response.text();
		return {
			error: errorText || `HTTP ${response.status}: ${response.statusText}`,
			code: "INTERNAL_ERROR",
		};
	} catch {
		return {
			error: `HTTP ${response.status}: ${response.statusText}`,
			code: "INTERNAL_ERROR",
		};
	}
}

// Banner notification handler for quota errors
function handleQuotaError(quotaError: QuotaExhaustedResponse): void {
	const { details } = quotaError;

	// Dispatch custom event to show quota banner
	window.dispatchEvent(
		new CustomEvent("quota-exhausted", {
			detail: {
				quotaType: details.quotaType,
				currentUsage: details.currentUsage,
				quotaLimit: details.quotaLimit,
				planId: details.planId,
			},
		})
	);
}

// Toast notification handler for general API errors
function handleGeneralError(error: ApiErrorResponse): void {
	let title = "Error";
	let description = error.error;

	// Customize messages based on error codes
	switch (error.code) {
		case "UNAUTHORIZED":
			title = "Authentication Required";
			description = "Please sign in to continue.";
			break;
		case "FORBIDDEN":
			title = "Access Denied";
			description = "You don't have permission to perform this action.";
			break;
		case "NOT_FOUND":
			title = "Not Found";
			description = "The requested resource was not found.";
			break;
		case "VALIDATION_ERROR":
			title = "Invalid Input";
			break;
		default:
			title = "Something went wrong";
	}

	toast.error(title, {
		description,
		duration: 4000,
	});
}

// Banner notification handler for rate limit errors
function handleRateLimitError(error: RateLimitExceededResponse): void {
	const { details } = error;

	// Dispatch custom event to show rate limit banner
	window.dispatchEvent(
		new CustomEvent("rate-limit-exceeded", {
			detail: {
				limitType: "requests",
				retryAfterSeconds: details.retryAfterSeconds || 60,
				limit: details.limit,
				remaining: details.remaining,
			},
		})
	);
}

// Wrapper for fetch requests with automatic error handling
export async function fetchWithErrorHandling(
	input: RequestInfo | URL,
	init?: RequestInit,
	options: {
		showToastOnError?: boolean;
		customErrorHandler?: (error: ApiErrorResponse) => void;
	} = {}
): Promise<Response> {
	const { showToastOnError = true, customErrorHandler } = options;

	try {
		const response = await fetch(input, init);

		if (!response.ok && showToastOnError) {
			const errorData = await extractErrorFromResponse(response.clone());

			if (errorData) {
				if (customErrorHandler) {
					customErrorHandler(errorData);
				} else if (isQuotaError(errorData)) {
					handleQuotaError(errorData);
				} else if (isRateLimitError(errorData)) {
					handleRateLimitError(errorData);
				} else {
					handleGeneralError(errorData);
				}
			}
		}

		return response;
	} catch (networkError) {
		if (showToastOnError) {
			toast.error("Connection Error", {
				description:
					"Unable to connect to the server. Please check your internet connection and try again.",
				duration: 5000,
			});
		}
		throw networkError;
	}
}
