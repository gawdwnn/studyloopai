/**
 * Generation Status API
 *
 * Returns current generation status and content availability
 */

import {
	getContentAvailability,
	isGenerationInProgress,
} from "@/lib/services/content-availability-service";
import { getServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const StatusQuerySchema = z.object({
	courseId: z.string().uuid("Invalid course ID"),
	weekId: z.string().uuid("Invalid week ID"),
});

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const courseId = url.searchParams.get("courseId");
		const weekId = url.searchParams.get("weekId");

		const query = StatusQuerySchema.parse({ courseId, weekId });

		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
		}

		// Get content availability status
		const availabilityStatus = await getContentAvailability(
			query.courseId,
			query.weekId
		);

		// Get generation progress status
		const isGenerating = await isGenerationInProgress(
			query.courseId,
			query.weekId
		);

		return NextResponse.json({
			success: true,
			...availabilityStatus,
			isGenerating,
		});
	} catch (error) {
		console.error("Generation status check failed:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: `Validation error: ${error.errors[0]?.message}` },
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}
