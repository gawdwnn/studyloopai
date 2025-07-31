import { getAdminClient, getServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { type NextRequest, NextResponse } from "next/server";

async function isOnboardingComplete(userId: string): Promise<boolean> {
	// Use admin client to bypass RLS policies for middleware checks
	const supabase = getAdminClient();
	const { data: user, error } = await supabase
		.from("users")
		.select("onboarding_completed, onboarding_skipped")
		.eq("user_id", userId)
		.single();

	if (error) {
		logger.error("Error checking onboarding status", {
			userId,
			message: error.message,
			code: error.code,
		});
		// Fail safe: if we can't check, assume not onboarded to force the flow.
		return false;
	}

	// Onboarding is considered "done" if it's either completed or explicitly skipped.
	return user?.onboarding_completed || user?.onboarding_skipped || false;
}

export async function middleware(request: NextRequest) {
	const supabaseResponse = NextResponse.next({
		request,
	});

	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		const pathname = request.nextUrl.pathname;

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

		// Onboarding flow for authenticated but not-yet-onboarded users
		const onboardingComplete = await isOnboardingComplete(user.id);
		const isOnboardingPage = pathname.startsWith("/onboarding");

		if (!onboardingComplete && !isOnboardingPage) {
			const url = request.nextUrl.clone();
			url.pathname = "/onboarding/welcome-profile";
			return NextResponse.redirect(url);
		}

		if (onboardingComplete && isOnboardingPage) {
			const url = request.nextUrl.clone();
			url.pathname = "/dashboard";
			return NextResponse.redirect(url);
		}

		// Handle authenticated users on auth pages
		const onAuthPage = pathname.startsWith("/auth/signin");
		if (user && onAuthPage) {
			const redirectUrl = request.nextUrl.clone();
			redirectUrl.pathname = "/dashboard";
			const response = NextResponse.redirect(redirectUrl);
			for (const cookie of supabaseResponse.cookies.getAll()) {
				response.cookies.set(cookie.name, cookie.value);
			}
			return response;
		}
	} catch (error) {
		logger.error("Middleware error", {
			pathname: request.nextUrl.pathname,
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
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
