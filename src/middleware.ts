import { getReqResClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

// Constants for signup steps
const SIGNUP_STEPS = {
  INCOMPLETE: 1,
  COMPLETE: 2,
} as const;

/**
 * Middleware to handle authentication and signup flow redirection
 * Protects dashboard routes and manages user signup completion flow
 */
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { client: supabase, response } = getReqResClient(req);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const pathname = req.nextUrl.pathname;

  // Protect dashboard route for unauthenticated users
  if (!session && pathname.startsWith("/dashboard")) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth/signin";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Handle authenticated users - only check signup step for specific routes
  if (session) {
    const onSignupPage = pathname === "/auth/signup";
    const onSigninPage = pathname === "/auth/signin";
    const onDashboardPage = pathname.startsWith("/dashboard");

    // Only perform database query for routes requiring signup step validation
    // This optimization prevents unnecessary DB calls on every request
    const needsSignupStepValidation =
      onSignupPage || onSigninPage || onDashboardPage;

    if (needsSignupStepValidation) {
      try {
        const { data: userData, error } = await supabase
          .from("users")
          .select("signup_step")
          .eq("user_id", session.user.id)
          .single();

        if (error) {
          console.error("Failed to fetch user signup step:", error);
          // Fall back to incomplete signup to ensure user completes flow
        }

        // Default to incomplete signup if the user record or step is missing
        const signupStep = userData?.signup_step ?? SIGNUP_STEPS.INCOMPLETE;

        // If signup is incomplete, force user to the plan selection step
        if (signupStep === SIGNUP_STEPS.INCOMPLETE && !onSignupPage) {
          const redirectUrl = req.nextUrl.clone();
          redirectUrl.pathname = "/auth/signup";
          redirectUrl.searchParams.set("step", "plan");
          return NextResponse.redirect(redirectUrl);
        }

        // If signup is complete, redirect away from auth pages to the dashboard
        if (
          signupStep === SIGNUP_STEPS.COMPLETE &&
          (onSignupPage || onSigninPage)
        ) {
          const redirectUrl = req.nextUrl.clone();
          redirectUrl.pathname = "/dashboard";
          return NextResponse.redirect(redirectUrl);
        }
      } catch (error) {
        console.error("Unexpected error in middleware:", error);
        // Continue with response to avoid breaking the app
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
