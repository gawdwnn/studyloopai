import { cacheGet, cacheSet } from "@/lib/cache";
import {
	getOnboardingCacheKey,
	shouldSkipOnboardingCheck,
	slugToStep,
	stepSlugs,
} from "@/lib/middleware/onboarding";
import { getAdminClient, getServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { type NextRequest, NextResponse } from "next/server";

interface OnboardingStatus {
	isComplete: boolean;
	currentStep: number | null;
	shouldRedirectToStep?: string;
}

async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
	const cacheKey = getOnboardingCacheKey(userId);

	// Try to get from cache first
	const cachedResult = await cacheGet<OnboardingStatus>(
		cacheKey,
		"onboardingIncomplete"
	);

	if (cachedResult !== null) {
		return cachedResult;
	}

	// Cache miss - fetch from database
	const supabase = getAdminClient();
	const { data: user, error } = await supabase
		.from("users")
		.select("onboarding_completed, onboarding_skipped, current_onboarding_step")
		.eq("user_id", userId)
		.single();

	if (error) {
		logger.error("Error checking onboarding status", {
			userId,
			message: error.message,
			code: error.code,
		});
		// Fail safe: assume not onboarded to force the flow
		return {
			isComplete: false,
			currentStep: null,
			shouldRedirectToStep: "welcome-profile",
		};
	}

	// Onboarding is "done" if completed or skipped
	const isComplete =
		user?.onboarding_completed || user?.onboarding_skipped || false;
	const currentStep = user?.current_onboarding_step;

	// Determine redirect step for incomplete onboarding
	let shouldRedirectToStep: string | undefined;
	if (!isComplete) {
		if (currentStep && stepSlugs[currentStep]) {
			shouldRedirectToStep = stepSlugs[currentStep];
		} else {
			// Start from beginning if no step is set
			shouldRedirectToStep = "welcome-profile";
		}
	}

	const result = { isComplete, currentStep, shouldRedirectToStep };

	// Cache with appropriate TTL based on completion status
	const cacheType = isComplete ? "onboardingComplete" : "onboardingIncomplete";
	await cacheSet(cacheKey, result, cacheType);

	return result;
}

export async function middleware(request: NextRequest) {
	const supabaseResponse = NextResponse.next({
		request,
	});

	const pathname = request.nextUrl.pathname;

	try {
		// Skip onboarding checks for static assets and API routes
		if (shouldSkipOnboardingCheck(pathname)) {
			return supabaseResponse;
		}

		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		// Route protection for unauthenticated users
		if (!user) {
			if (
				pathname.startsWith("/dashboard") ||
				pathname.startsWith("/onboarding")
			) {
				const url = request.nextUrl.clone();
				url.pathname = "/auth/signin";
				url.searchParams.set("redirectedFrom", pathname);
				return NextResponse.redirect(url);
			}
			return supabaseResponse;
		}

		// Redirect authenticated users away from signin
		if (pathname.startsWith("/auth/signin")) {
			const redirectUrl = request.nextUrl.clone();
			redirectUrl.pathname = "/dashboard";
			const response = NextResponse.redirect(redirectUrl);
			for (const cookie of supabaseResponse.cookies.getAll()) {
				response.cookies.set(cookie.name, cookie.value);
			}
			return response;
		}

		// Only check onboarding for protected routes
		const needsOnboardingCheck =
			pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");
		if (!needsOnboardingCheck) {
			return supabaseResponse;
		}

		// Get onboarding status (cached)
		const onboardingStatus = await getOnboardingStatus(user.id);
		const isOnboardingPage = pathname.startsWith("/onboarding");

		// Redirect incomplete users to onboarding
		if (!onboardingStatus.isComplete && !isOnboardingPage) {
			const url = request.nextUrl.clone();
			url.pathname = `/onboarding/${onboardingStatus.shouldRedirectToStep}`;
			return NextResponse.redirect(url);
		}

		// Redirect completed users away from onboarding
		if (onboardingStatus.isComplete && isOnboardingPage) {
			const url = request.nextUrl.clone();
			url.pathname = "/dashboard";
			return NextResponse.redirect(url);
		}

		// Onboarding step validation - prevent jumping ahead
		if (
			!onboardingStatus.isComplete &&
			isOnboardingPage &&
			onboardingStatus.shouldRedirectToStep
		) {
			const currentPageStep = pathname.split("/onboarding/")[1];
			const currentStepNum = onboardingStatus.currentStep || 1;

			// Check if trying to access invalid or future steps
			const pageStepNum = slugToStep[currentPageStep];

			// Only redirect if:
			// 1. Invalid step slug, OR
			// 2. Trying to access steps too far ahead (more than 1 step ahead)
			if (!pageStepNum || pageStepNum > currentStepNum + 1) {
				const url = request.nextUrl.clone();
				url.pathname = `/onboarding/${onboardingStatus.shouldRedirectToStep}`;
				return NextResponse.redirect(url);
			}
		}
	} catch (error) {
		logger.error(
			{
				err: error,
				pathname,
			},
			"Middleware error"
		);
	} finally {
		// Log slow middleware execution for performance monitoring
	}

	return supabaseResponse;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * Feel free to modify this pattern to include more paths.
		 */
		"/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
