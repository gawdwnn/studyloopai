import { getServerClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

/**
 * This route is automatically called by the browser-side Supabase client
 * (created via `createBrowserClient`) whenever the auth state changes.
 * It persists the current session in secure, http-only cookies so that
 * subsequent Server Actions / Route Handlers can authenticate the user
 * through `createServerClient` (see `lib/supabase/server.ts`).
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = await getServerClient();
		const { event, session } = await request.json();

		if (!event) return new Response("Missing auth event", { status: 400 });

		if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
			if (!session) return new Response("Missing session", { status: 400 });
			// Persist the session in cookies so that server code can read it
			await supabase.auth.setSession(session);
		} else if (event === "SIGNED_OUT") {
			await supabase.auth.signOut();
		}

		return new Response(null, { status: 200 });
	} catch (err) {
		console.error("Auth cookie route error", err);
		return new Response("Auth cookie error", { status: 500 });
	}
}
