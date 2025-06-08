import { getServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  // If Supabase returns an error, redirect to signin page with the error message
  if (error || errorDescription) {
    const errorMessage = errorDescription || error;
    return NextResponse.redirect(
      new URL(
        `/auth/signin?error=${encodeURIComponent(
          errorMessage || "Sorry, we couldn't authenticate you."
        )}`,
        request.url
      )
    );
  }

  // If there's no code, the link is invalid.
  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/auth/signin?error=${encodeURIComponent(
          "Invalid or missing authentication code."
        )}`,
        request.url
      )
    );
  }

  const supabase = getServerClient();
  const { error: authError } = await supabase.auth.exchangeCodeForSession(code);

  // If the code exchange fails, redirect with the specific error
  if (authError) {
    return NextResponse.redirect(
      new URL(
        `/auth/signin?error=${encodeURIComponent(
          authError.message || "Email link is invalid or has expired."
        )}`,
        request.url
      )
    );
  }

  // On success, redirect to the 'next' URL, which defaults to dashboard
  return NextResponse.redirect(new URL(next, request.url));
}
