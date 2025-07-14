import { getServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Simplified middleware to handle authentication
 * Protects dashboard routes - no complex signup flow needed with magic link auth
 */
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

		// Protect dashboard routes - redirect unauthenticated users to signin
		if (!user) {
			if (pathname.startsWith("/dashboard")) {
				const url = request.nextUrl.clone();
				url.pathname = "/auth/signin";
				url.searchParams.set("redirectedFrom", pathname);
				return NextResponse.redirect(url);
			}
			return supabaseResponse;
		}

		// Handle authenticated users - redirect from auth pages to dashboard
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
		// Handle Supabase client creation errors
		console.error("Middleware: Failed to create Supabase client:", error);
		// Continue with the request - don't block user access for Supabase errors
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
