import { NextResponse } from "next/server";

/**
 * Simple health check endpoint for connectivity testing
 * Used by offline handler to verify network connectivity
 */
export async function GET() {
	return NextResponse.json(
		{
			status: "ok",
			timestamp: new Date().toISOString(),
			service: "studyloop-ai",
		},
		{ status: 200 }
	);
}

export async function HEAD() {
	// Lightweight connectivity check - no response body
	return new NextResponse(null, { status: 200 });
}
