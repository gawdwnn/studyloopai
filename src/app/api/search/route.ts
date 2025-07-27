import { getServerClient } from "@/lib/supabase/server";
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

		const body: SearchRequest = await request.json();
		const { query, materialIds, limit = 10, threshold = 0.7 } = body;

		if (!query || typeof query !== "string") {
			return NextResponse.json({ error: "Query is required" }, { status: 400 });
		}

		const searchResult = await searchSimilarChunks(query, {
			limit,
			threshold,
			materialIds,
			includeMetadata: true,
		});

		if (!searchResult.success) {
			return NextResponse.json({ error: searchResult.error }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			results: searchResult.results,
			totalResults: searchResult.totalResults,
			searchTime: searchResult.searchTime,
		});
	} catch (error) {
		console.error("Search API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
