import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (code) {
    const supabase = getServerClient();

    try {
      const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (authError) {
        console.error("Auth error:", authError);
        throw authError;
      }
    } catch (error) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(
        new URL(
          `/auth/signin?error=${encodeURIComponent("Authentication failed. Please try again.")}`,
          request.url
        )
      );
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
