/**
 * Helper function to get the correct site URL.
 * It's designed to work in both server-side and client-side environments.
 *
 * On the client side, it uses `window.location.origin`.
 * On the server side, it uses `NEXT_PUBLIC_SITE_URL` (recommended) or `NEXT_PUBLIC_VERCEL_URL`.
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
	// `NEXT_PUBLIC_SITE_URL` should be set to your canonical production URL.
	// It should include the protocol (e.g., "https://example.com").
	if (process.env.NEXT_PUBLIC_SITE_URL) {
		// Remove trailing slash if present
		return process.env.NEXT_PUBLIC_SITE_URL.endsWith("/")
			? process.env.NEXT_PUBLIC_SITE_URL.slice(0, -1)
			: process.env.NEXT_PUBLIC_SITE_URL;
	}

	// Vercel provides this environment variable.
	if (process.env.NEXT_PUBLIC_VERCEL_URL) {
		return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
	}

	// Fallback for local development.
	return "http://localhost:3000";
};
