import { getReqResClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { client: supabase, response } = getReqResClient(req);

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  if (!session && pathname.startsWith("/dashboard")) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth/signin";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages (except reset-password)
  if (session && pathname.startsWith("/auth")) {
    // Allow access to reset-password page even when authenticated
    if (pathname === "/auth/reset-password") {
      return response;
    }

    // Redirect from other auth pages to dashboard
    return NextResponse.redirect(new URL("/dashboard", req.url));
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
