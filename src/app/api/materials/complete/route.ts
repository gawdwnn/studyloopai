"use server";

import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import type { ingestCourseMaterials } from "@/trigger/ingest-course-materials";
import { tasks } from "@trigger.dev/sdk";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
	materialIds: z
		.array(z.string().uuid("Invalid material ID"))
		.min(1, "At least one material ID is required")
		.max(50, "Maximum 50 materials allowed per batch"),
});

export async function POST(req: NextRequest) {
	try {
		const json = await req.json();
		const body = BodySchema.parse(json);

		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

		const materials = await db
			.select()
			.from(courseMaterials)
			.where(
				and(inArray(courseMaterials.id, body.materialIds), eq(courseMaterials.uploadedBy, user.id))
			);

		if (materials.length === 0) {
			return NextResponse.json({ error: "No matching materials found" }, { status: 404 });
		}

		// Check if some materials were filtered out (could be due to RLS or non-existence)
		if (materials.length < body.materialIds.length) {
			return NextResponse.json(
				{ error: "Some materials not found or access denied" },
				{ status: 404 }
			);
		}

		// Ensure all materials have a filePath (upload finished)
		const ingestMaterials = materials.filter((m) => m.filePath);

		if (ingestMaterials.length === 0) {
			return NextResponse.json({ error: "No materials are ready for processing" }, { status: 400 });
		}

		// Check if some materials are not ready for processing
		if (ingestMaterials.length < materials.length) {
			const pendingCount = materials.length - ingestMaterials.length;
			return NextResponse.json(
				{
					error: `${pendingCount} materials are still uploading. Please wait for all uploads to complete.`,
				},
				{ status: 400 }
			);
		}

		// Validate materials are not already being processed
		const alreadyProcessing = ingestMaterials.filter(
			(m) => m.uploadStatus === "processing" || m.embeddingStatus === "processing"
		);

		if (alreadyProcessing.length > 0) {
			return NextResponse.json(
				{ error: "Some materials are already being processed" },
				{ status: 409 }
			);
		}

		// Validate all materials belong to the same course for consistency
		// This helps prevent accidental cross-course processing
		const courseIds = new Set(ingestMaterials.map((m) => m.courseId));
		if (courseIds.size > 1) {
			return NextResponse.json(
				{ error: "Materials must belong to the same course" },
				{ status: 400 }
			);
		}

		// Validate all materials belong to the same week for batch processing efficiency
		const weekIds = new Set(ingestMaterials.map((m) => m.weekId).filter(Boolean));
		if (weekIds.size > 1) {
			return NextResponse.json(
				{ error: "Materials must belong to the same week" },
				{ status: 400 }
			);
		}

		// Update uploadStatus to completed
		// Add explicit filter for performance optimization
		await db
			.update(courseMaterials)
			.set({ uploadStatus: "completed" })
			.where(
				and(
					inArray(
						courseMaterials.id,
						ingestMaterials.map((m) => m.id)
					),
					eq(courseMaterials.uploadedBy, user.id)
				)
			);

		// Trigger ingest task for those materials
		const ingestHandle = await tasks.trigger<typeof ingestCourseMaterials>(
			"ingest-course-materials",
			{
				userId: user.id,
				materials: ingestMaterials.map((m) => ({
					materialId: m.id,
					filePath: m.filePath as string,
					contentType: m.contentType as string,
				})),
			}
		);

		return NextResponse.json({
			success: true,
			runId: ingestHandle.id,
			publicAccessToken: ingestHandle.publicAccessToken,
		});
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 400 }
		);
	}
}
