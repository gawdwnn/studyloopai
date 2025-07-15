import { env } from "@/env";

/**
 * Helper function to get the correct site URL.
 * It's designed to work in both server-side and client-side environments.
 *
 * On the client side, it uses `window.location.origin`.
 * On the server side, it uses `NEXT_PUBLIC_SITE_URL` (recommended) or a Vercel URL.
 * It falls back to `http://localhost:3000` for local development.
 *
 * @returns {string} The site URL, without a trailing slash.
 */
export const getSiteUrl = (): string => {
	// On the client, we use `window.location.origin`.
	if (typeof window !== "undefined") {
		return window.location.origin;
	}

	// For server-side rendering, we use environment variables.
	let url = env.NEXT_PUBLIC_SITE_URL;

	// Vercel provides this environment variable, which can be a fallback.
	if (!url && process.env.NEXT_PUBLIC_VERCEL_URL) {
		url = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
	}

	// Fallback for local development if nothing else is set.
	if (!url) {
		return "http://localhost:3000";
	}

	// Remove trailing slash if present
	return url.endsWith("/") ? url.slice(0, -1) : url;
};
