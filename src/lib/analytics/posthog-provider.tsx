"use client";

import { env } from "@/env";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

/**
 * PostHog client-side provider
 */

// Initialize PostHog on the client side only
if (
	typeof window !== "undefined" &&
	env.NEXT_PUBLIC_POSTHOG_KEY &&
	process.env.DISABLE_POSTHOG !== "true"
) {
	posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
		api_host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
		person_profiles: "identified_only",
		capture_pageleave: false,
		session_recording: {
			maskAllInputs: true,
			blockClass: "ph-no-capture",
		},
		autocapture: {
			dom_event_allowlist: [],
		},
		loaded: () => {
			if (process.env.NODE_ENV === "development") {
				// PostHog initialized - development only
			}
		},
	});
}

/**
 * Page view tracking component
 * Automatically tracks page views when the route changes
 */
function PostHogPageView() {
	const pathname = usePathname();

	useEffect(() => {
		if (pathname && typeof window !== "undefined") {
			// FOCUSED: Only track important pages, not every single page view
			const importantPages = ["/dashboard", "/onboarding", "/auth/signin"];

			// Check if current page is important or contains important paths
			const isImportantPage = importantPages.some((page) =>
				pathname.startsWith(page)
			);

			if (isImportantPage) {
				posthog.capture("$pageview", {
					page_category: "important",
				});
			}
		}
	}, [pathname]);

	return null;
}

/**
 * PostHog provider component
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
	// If PostHog is not configured or disabled, render children without analytics
	if (!env.NEXT_PUBLIC_POSTHOG_KEY || process.env.DISABLE_POSTHOG === "true") {
		if (process.env.NODE_ENV === "development") {
			console.warn("PostHog disabled - analytics turned off");
		}
		return <>{children}</>;
	}

	return (
		<PHProvider client={posthog}>
			<PostHogPageView />
			{children}
		</PHProvider>
	);
}

/**
 * Custom hook for safe PostHog usage
 */
export function usePostHogSafe() {
	const safeCapture = (event: string, properties?: Record<string, unknown>) => {
		try {
			if (typeof window !== "undefined" && posthog) {
				posthog.capture(event, properties);
			}
		} catch (error) {
			if (process.env.NODE_ENV === "development") {
				console.warn("PostHog capture failed:", error);
			}
		}
	};

	const safeIdentify = (
		userId: string,
		properties?: Record<string, unknown>
	) => {
		try {
			if (typeof window !== "undefined" && posthog) {
				posthog.identify(userId, properties);
			}
		} catch {}
	};

	const safeSetPersonProperties = (properties: Record<string, unknown>) => {
		try {
			if (typeof window !== "undefined" && posthog) {
				posthog.setPersonProperties(properties);
			}
		} catch {}
	};

	const safeFeatureFlag = (flagKey: string, defaultValue = false) => {
		try {
			if (typeof window !== "undefined" && posthog) {
				return posthog.isFeatureEnabled(flagKey) ?? defaultValue;
			}
			return defaultValue;
		} catch {
			return defaultValue;
		}
	};

	return {
		capture: safeCapture,
		identify: safeIdentify,
		setPersonProperties: safeSetPersonProperties,
		isFeatureEnabled: safeFeatureFlag,
		posthog: typeof window !== "undefined" ? posthog : null,
	};
}
