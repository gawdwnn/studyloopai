import { cacheInvalidate } from "@/lib/cache";

/**
 * Onboarding step configuration and utilities for middleware
 */

// Map step numbers to slugs - shared constant for consistency
export const stepSlugs: Record<number, string> = {
	1: "welcome-profile",
	2: "personalization",
	3: "billing",
	4: "completion",
};

// Reverse lookup for better performance - slug to step number
export const slugToStep: Record<string, number> = Object.fromEntries(
	Object.entries(stepSlugs).map(([step, slug]) => [slug, Number(step)])
);

// Static path optimization - skip onboarding checks for certain paths
const skipOnboardingPaths = new Set([
	"/api",
	"/auth/callback",
	"/auth/cookie",
	"/_next",
	"/favicon.ico",
	"/public",
]);

/**
 * Check if a pathname should skip onboarding validation
 */
export const shouldSkipOnboardingCheck = (pathname: string): boolean => {
	return Array.from(skipOnboardingPaths).some((path) =>
		pathname.startsWith(path)
	);
};

/**
 * Generate cache key for onboarding status
 */
export const getOnboardingCacheKey = (userId: string): string =>
	`onboarding:${userId}`;

/**
 * Invalidate onboarding cache - call when onboarding status changes
 */
export const invalidateOnboardingCache = async (
	userId: string
): Promise<void> => {
	await cacheInvalidate(getOnboardingCacheKey(userId));
};
