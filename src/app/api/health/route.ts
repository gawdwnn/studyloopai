import { checkHealthRateLimit, extractIP } from "@/lib/rate-limit";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Simple health check endpoint for connectivity testing
 * Used by offline handler to verify network connectivity
 * IP-based rate limiting to prevent DDoS and information disclosure
 */
export async function GET(request: NextRequest) {
	try {
		// IP-based rate limiting (100 requests/hour per IP)
		const ip = extractIP(request);
		const rateLimitResult = await checkHealthRateLimit(ip);

		if (!rateLimitResult.success) {
			return NextResponse.json(
				{ error: "Rate limit exceeded" },
				{
					status: 429,
					headers: {
						"X-RateLimit-Limit": rateLimitResult.limit.toString(),
						"X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
						"Retry-After": "3600",
					},
				}
			);
		}

		const response = NextResponse.json(
			{
				status: "ok",
				timestamp: new Date().toISOString(),
				service: "studyloop-ai",
			},
			{ status: 200 }
		);

		// Add rate limit headers
		response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
		response.headers.set(
			"X-RateLimit-Remaining",
			rateLimitResult.remaining.toString()
		);

		return response;
	} catch (_error) {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function HEAD(request: NextRequest) {
	try {
		// Apply same IP-based rate limiting to HEAD requests
		const ip = extractIP(request);
		const rateLimitResult = await checkHealthRateLimit(ip);

		if (!rateLimitResult.success) {
			return new NextResponse(null, {
				status: 429,
				headers: {
					"X-RateLimit-Limit": rateLimitResult.limit.toString(),
					"X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
					"Retry-After": "3600",
				},
			});
		}

		// Lightweight connectivity check - no response body
		return new NextResponse(null, {
			status: 200,
			headers: {
				"X-RateLimit-Limit": rateLimitResult.limit.toString(),
				"X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
			},
		});
	} catch (_error) {
		return new NextResponse(null, { status: 500 });
	}
}
