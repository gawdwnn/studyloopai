import { env } from "@/env";
import { PostHog } from "posthog-node";

/**
 * PostHog server-side client for tracking events in API routes and server actions
 */
export const posthog =
	env.POSTHOG_API_KEY && process.env.DISABLE_POSTHOG !== "true"
		? new PostHog(env.POSTHOG_API_KEY, {
				host: env.POSTHOG_HOST || "https://us.i.posthog.com",
				flushAt: 1, // Flush immediately for serverless environments
				flushInterval: 0, // Disable interval flushing for serverless
			})
		: null;

/**
 * Server-side event tracking
 */
export async function trackServerEvent(
	event: string,
	properties: Record<string, unknown> = {},
	profileId?: string
) {
	if (!posthog) {
		if (process.env.NODE_ENV === "development") {
			console.warn("PostHog not configured - server event not tracked:", event);
		}
		return;
	}

	try {
		posthog.capture({
			distinctId: profileId || "anonymous",
			event,
			properties,
		});

		// Important: Ensure events are flushed in serverless environments
		await posthog.shutdown();
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("PostHog server tracking error:", error);
		}
	}
}

/**
 * PostHog event types for product analytics
 */
export type PostHogEventName =
	// User Journey Events
	| "user_signup"
	| "user_login"
	| "user_logout"
	| "onboarding_completed"
	// Product Usage Events
	| "course_created"
	| "course_deleted"
	| "material_uploaded"
	| "ai_content_generated"
	| "study_session_started"
	| "study_session_completed"
	// Feature Adoption Events
	| "feature_discovered"
	| "feature_used"
	| "help_accessed"
	// Conversion Events
	| "subscription_started"
	| "subscription_cancelled"
	| "plan_upgraded"
	| "checkout_started"
	| "checkout_completed"
	| "payment_failed"
	| "ai_content_regenerated";

/**
 * User identification for server-side tracking
 * Links anonymous sessions to identified users
 */
export async function identifyUser(
	userId: string,
	properties: Record<string, unknown> = {}
) {
	if (!posthog) {
		if (process.env.NODE_ENV === "development") {
			console.warn("PostHog not configured - user identification skipped");
		}
		return;
	}

	try {
		posthog.identify({
			distinctId: userId,
			properties,
		});

		await posthog.shutdown();
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("PostHog user identification error:", error);
		}
	}
}

/**
 * Set user properties for enhanced segmentation
 */
export async function setUserProperties(
	userId: string,
	properties: Record<string, unknown>
) {
	if (!posthog) {
		if (process.env.NODE_ENV === "development") {
			console.warn("PostHog not configured - user properties not set");
		}
		return;
	}

	try {
		posthog.capture({
			distinctId: userId,
			event: "$set",
			properties: {
				$set: properties,
			},
		});

		await posthog.shutdown();
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("PostHog set user properties error:", error);
		}
	}
}
