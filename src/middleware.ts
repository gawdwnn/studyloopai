import { SIGNUP_STEPS, type SignupStep, isValidSignupStep } from "@/lib/constants/auth";
import { UserAuthCache } from "@/lib/cache/redis-cache";
import { getServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Middleware to handle authentication and signup flow redirection
 * Protects dashboard routes and manages user signup completion flow
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

    if (!user) {
      if (pathname.startsWith("/dashboard")) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/signin";
        url.searchParams.set("redirectedFrom", pathname);
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // Handle authenticated users
    const onSignupPage = pathname === "/auth/signup";
    const onSigninPage = pathname === "/auth/signin";

    try {
      let signupStep: SignupStep = SIGNUP_STEPS.INCOMPLETE;
      
      // Try to get user auth data from cache first (but gracefully handle Redis failures)
      let cachedAuthData = null;
      try {
        const authCache = new UserAuthCache();
        cachedAuthData = await authCache.getUserAuthData(user.id);
      } catch (cacheError) {
        console.warn("Middleware: Cache error, continuing without cache:", cacheError);
      }
      
      if (cachedAuthData && isValidSignupStep(cachedAuthData.signup_step)) {
        signupStep = cachedAuthData.signup_step;
      } else {
        // Cache miss or expired, fetch from database
        const { data: userData, error: userDataError } = await supabase
          .from("users")
          .select("signup_step")
          .eq("user_id", user.id)
          .single();

        // If there's a database error, log it but continue with safe defaults
        if (userDataError) {
          console.error("Middleware: Failed to fetch user data:", userDataError);

          // Default to incomplete signup to ensure user goes through proper flow
          // Redirect to signup if not already there
          if (!onSignupPage) {
            const redirectUrl = request.nextUrl.clone();
            redirectUrl.pathname = "/auth/signup";
            redirectUrl.searchParams.set("step", "plan");
            const response = NextResponse.redirect(redirectUrl);
            for (const cookie of supabaseResponse.cookies.getAll()) {
              response.cookies.set(cookie.name, cookie.value);
            }
            return response;
          }
          return supabaseResponse;
        }

        const dbSignupStep = userData?.signup_step ?? SIGNUP_STEPS.INCOMPLETE;
        signupStep = isValidSignupStep(dbSignupStep) ? dbSignupStep : SIGNUP_STEPS.INCOMPLETE;
        
        // Cache the result for future requests (but don't let cache failures block the request)
        try {
          const authCache = new UserAuthCache();
          await authCache.setUserAuthData(user.id, signupStep);
        } catch (cacheError) {
          console.warn("Middleware: Failed to cache user data:", cacheError);
        }
      }

      if (signupStep === SIGNUP_STEPS.INCOMPLETE && !onSignupPage) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/auth/signup";
        redirectUrl.searchParams.set("step", "plan");
        const response = NextResponse.redirect(redirectUrl);
        for (const cookie of supabaseResponse.cookies.getAll()) {
          response.cookies.set(cookie.name, cookie.value);
        }
        return response;
      }

      if (
        signupStep === SIGNUP_STEPS.COMPLETE &&
        (onSignupPage || onSigninPage)
      ) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/dashboard";
        const response = NextResponse.redirect(redirectUrl);
        for (const cookie of supabaseResponse.cookies.getAll()) {
          response.cookies.set(cookie.name, cookie.value);
        }
        return response;
      }
    } catch (error) {
      // Log unexpected errors and fail safely
      console.error(
        "Middleware: Unexpected error during user data fetch:",
        error
      );
      // Continue with the request - don't block user access for unexpected errors
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
