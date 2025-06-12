import { type CookieOptions, createServerClient } from "@supabase/ssr";
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
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // This should not happen if environment variables are set correctly
    return NextResponse.next();
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[]
      ) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({
          request,
        });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

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
    const { data: userData } = await supabase
      .from("users")
      .select("signup_step")
      .eq("user_id", user.id)
      .single();

    const signupStep = userData?.signup_step ?? SIGNUP_STEPS.INCOMPLETE;

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
  } catch {
    // ignore error
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
