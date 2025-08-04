/**
 * Quota exhaustion handler with user-friendly messaging and recovery options
 */

import { logger } from "@/lib/utils/logger";
import {
	QuotaExhaustedError,
	getProviderFromError,
	isQuotaExhaustedError,
} from "./errors";

interface QuotaExhaustionNotification {
	userMessage: string;
	technicalMessage: string;
	actionRequired: string;
	retryable: boolean;
	provider: "openai" | "xai" | "unknown";
}

/**
 * Handle quota exhaustion errors with user-friendly messaging
 */
export function handleQuotaExhaustion(
	error: unknown
): QuotaExhaustionNotification {
	const provider = getProviderFromError(error);

	// Base messages for different providers
	const providerMessages = {
		openai: {
			userMessage:
				"AI features are temporarily unavailable due to API quota limits.",
			actionRequired:
				"Please contact support to upgrade your OpenAI plan or add billing credits.",
		},
		xai: {
			userMessage:
				"AI features are temporarily unavailable due to xAI quota limits.",
			actionRequired:
				"Please contact support to upgrade your xAI plan or add billing credits.",
		},
		unknown: {
			userMessage:
				"AI features are temporarily unavailable due to quota limits.",
			actionRequired: "Please contact support to resolve the quota issue.",
		},
	};

	const messages = providerMessages[provider] || providerMessages.unknown;

	let technicalMessage = "Unknown quota error";
	if (error instanceof Error) {
		technicalMessage = error.message;
	} else if (error instanceof QuotaExhaustedError) {
		technicalMessage = `${error.provider} quota exhausted: ${error.message}`;
	}

	// Log the quota exhaustion for monitoring
	logger.error("Quota exhaustion detected", {
		provider,
		technicalMessage,
		timestamp: new Date().toISOString(),
		requiresImmedateAction: true,
	});

	return {
		userMessage: messages.userMessage,
		technicalMessage,
		actionRequired: messages.actionRequired,
		retryable: false, // Quota exhaustion is not retryable
		provider,
	};
}

/**
 * Check if any error is quota related and handle accordingly
 */
export function processAIError(error: unknown): {
	isQuotaIssue: boolean;
	notification?: QuotaExhaustionNotification;
	shouldShowToUser: boolean;
} {
	if (isQuotaExhaustedError(error)) {
		return {
			isQuotaIssue: true,
			notification: handleQuotaExhaustion(error),
			shouldShowToUser: true,
		};
	}

	return {
		isQuotaIssue: false,
		shouldShowToUser: false,
	};
}

/**
 * Generate user-friendly toast message for quota exhaustion
 */
export function getQuotaToastMessage(
	provider: "openai" | "xai" | "unknown"
): string {
	switch (provider) {
		case "openai":
			return "OpenAI quota exceeded. AI features temporarily unavailable. Please contact support.";
		case "xai":
			return "xAI quota exceeded. AI features temporarily unavailable. Please contact support.";
		default:
			return "AI quota exceeded. Features temporarily unavailable. Please contact support.";
	}
}

/**
 * Analytics tracking for quota exhaustion events
 */
export function trackQuotaExhaustion(provider: string, feature: string): void {
	logger.warn("Quota exhaustion analytics", {
		provider,
		feature,
		timestamp: new Date().toISOString(),
		severity: "high",
		requiresAttention: true,
	});

	// Here you could also send to analytics service like PostHog, Mixpanel, etc.
	// analytics.track('quota_exhausted', { provider, feature });
}
