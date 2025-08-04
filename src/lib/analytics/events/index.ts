/**
 * Analytics Events
 *
 * Centralized exports for all analytics event modules.
 * This provides a clean API for importing analytics events throughout the application.
 *
 * Usage examples:
 * ```ts
 * import { billingEvents, onboardingEvents } from '@/lib/analytics/events'
 * import { contentGenerationEvents } from '@/lib/analytics/events'
 *
 * Track billing event
 * await billingEvents.checkoutStarted(planId, planPrice, 'USD', userId)
 *
 * Track onboarding progress
 * await onboardingEvents.stepCompleted(2, { hasProfileData: true }, userId)
 *
 * Track content generation
 * await contentGenerationEvents.contentGenerated('summary', { courseId, processingTime }, userId)
 * ```
 */

// Re-export all event modules
import { authEvents } from "./auth";
import { billingEvents } from "./billing";
import { contentGenerationEvents } from "./content-generation";
import { courseEvents } from "./course";
import { onboardingEvents } from "./onboarding";

export { authEvents } from "./auth";
export { billingEvents } from "./billing";
export { contentGenerationEvents } from "./content-generation";
export { courseEvents } from "./course";
export { onboardingEvents } from "./onboarding";

// Type exports for external usage
export type { PostHogEventName } from "../posthog";

// Unified events object for convenience (optional usage pattern)
export const events = {
	auth: authEvents,
	billing: billingEvents,
	contentGeneration: contentGenerationEvents,
	course: courseEvents,
	onboarding: onboardingEvents,
} as const;

// Re-export core PostHog functions that might be needed alongside events
export {
	identifyUser,
	setUserProperties,
	trackServerEvent,
} from "../posthog";
