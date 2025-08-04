import { cacheAside } from "@/lib/cache";
import { checkAPIStrictRateLimit } from "@/lib/rate-limit";
import { getServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { searchSimilarChunks } from "@/lib/vector/vector-search";
import { type NextRequest, NextResponse } from "next/server";

interface SearchRequest {
	query: string;
	materialIds?: string[];
	limit?: number;
	threshold?: number;
}

export async function POST(request: NextRequest) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 }
			);
		}

		// Apply rate limiting - strict limits for expensive vector operations
		const rateLimitResult = await checkAPIStrictRateLimit(user.id);

		if (!rateLimitResult.success) {
			const resetMinutes = rateLimitResult.reset
				? Math.ceil((rateLimitResult.reset - Date.now()) / 60000)
				: 30;

			return NextResponse.json(
				{
					error: "Rate limit exceeded",
					message: `Too many search requests. Try again in ${resetMinutes} minutes.`,
					remainingAttempts: rateLimitResult.remaining,
					resetTime: rateLimitResult.reset,
				},
				{
					status: 429,
					headers: {
						"X-RateLimit-Limit": rateLimitResult.limit.toString(),
						"X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
						"X-RateLimit-Reset": rateLimitResult.reset?.toString() || "",
						"Retry-After": Math.ceil(
							((rateLimitResult.reset || Date.now()) - Date.now()) / 1000
						).toString(),
					},
				}
			);
		}

		const body: SearchRequest = await request.json();
		const { query, materialIds, limit = 10, threshold = 0.7 } = body;

		if (!query || typeof query !== "string") {
			return NextResponse.json({ error: "Query is required" }, { status: 400 });
		}

		// Create cache key based on search parameters and user context
		const cacheKey = `search:${user.id}:${JSON.stringify({
			query: query.toLowerCase().trim(),
			materialIds: materialIds?.sort(),
			limit,
			threshold,
		})}`;

		// Use cache-aside pattern with 15-minute TTL
		const searchResult = await cacheAside(cacheKey, "apiResponse", async () => {
			return await searchSimilarChunks(query, {
				limit,
				threshold,
				materialIds,
				includeMetadata: true,
			});
		});

		if (!searchResult.success) {
			return NextResponse.json({ error: searchResult.error }, { status: 500 });
		}

		const response = NextResponse.json({
			success: true,
			results: searchResult.results,
			totalResults: searchResult.totalResults,
			searchTime: searchResult.searchTime,
		});

		// Add rate limit headers to successful responses
		response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
		response.headers.set(
			"X-RateLimit-Remaining",
			rateLimitResult.remaining.toString()
		);
		if (rateLimitResult.reset) {
			response.headers.set(
				"X-RateLimit-Reset",
				rateLimitResult.reset.toString()
			);
		}

		return response;
	} catch (error) {
		logger.error("Search API operation failed", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			route: "/api/search",
			method: "POST",
		});
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
