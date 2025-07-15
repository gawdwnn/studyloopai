import { getServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Validates if a redirect URL is safe to use
 * Only allows relative URLs that don't start with // (protocol-relative URLs)
 */
function validateRedirectUrl(url: string | null): string {
	if (!url) return "/dashboard";
	
	// Only allow relative URLs that start with / but not //
	if (url.startsWith("/") && !url.startsWith("//")) {
		return url;
	}
	
	// Block all external redirects - return default
	return "/dashboard";
}

export async function GET(req: NextRequest) {
	const supabase = await getServerClient();

	const requestUrl = new URL(req.url);
	
	// Support both implicit flow (code) and PKCE flow (token_hash)
	const code = requestUrl.searchParams.get("code");
	const token_hash = requestUrl.searchParams.get("token_hash");
	const type = requestUrl.searchParams.get("type");
	const next = validateRedirectUrl(requestUrl.searchParams.get("next"));

	try {
		// Handle PKCE flow (recommended for magic links)
		if (token_hash && type === "email") {
			const { error } = await supabase.auth.verifyOtp({
				token_hash,
				type: "email",
			});

			if (error) {
				console.error("PKCE auth error:", error);
				return NextResponse.redirect(
					`${requestUrl.origin}/auth/signin?error=auth_error&error_description=${encodeURIComponent(
						"Authentication failed. Please try again."
					)}`
				);
			}
		}
		// Handle implicit flow (fallback for existing links)
		else if (code) {
			const { error } = await supabase.auth.exchangeCodeForSession(code);

			if (error) {
				console.error("Code exchange error:", error);
				return NextResponse.redirect(
					`${requestUrl.origin}/auth/signin?error=auth_error&error_description=${encodeURIComponent(
						"Authentication failed. Please try again."
					)}`
				);
			}
		}
		// No valid auth parameters
		else {
			return NextResponse.redirect(
				`${requestUrl.origin}/auth/signin?error=invalid_request&error_description=${encodeURIComponent(
					"Invalid authentication request."
				)}`
			);
		}

		// On successful authentication, redirect to the validated destination
		return NextResponse.redirect(`${requestUrl.origin}${next}`);
		
	} catch (error) {
		console.error("Auth callback error:", error);
		return NextResponse.redirect(
			`${requestUrl.origin}/auth/signin?error=server_error&error_description=${encodeURIComponent(
				"An unexpected error occurred. Please try again."
			)}`
		);
	}
}
