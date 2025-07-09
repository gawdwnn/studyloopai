"use server";

import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import type { ingestCourseMaterials } from "@/trigger/ingest-course-materials";
import { tasks } from "@trigger.dev/sdk";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Generation config validation schema
const GenerationConfigSchema = z.object({
	goldenNotesCount: z.number().min(1).max(20),
	cuecardsCount: z.number().min(1).max(50),
	summaryLength: z.number().min(50).max(1000),
	examExercisesCount: z.number().min(1).max(20),
	mcqExercisesCount: z.number().min(1).max(50),
	difficulty: z.enum(["beginner", "intermediate", "advanced"]),
	focus: z.enum(["conceptual", "practical", "mixed"]),
});

const BodySchema = z.object({
	materialIds: z
		.array(z.string().uuid("Invalid material ID"))
		.min(1, "At least one material ID is required")
		.max(50, "Maximum 50 materials allowed per batch"),
	weekId: z.string().uuid("Invalid week ID"),
	courseId: z.string().uuid("Invalid course ID"),
	generationConfig: GenerationConfigSchema.optional(),
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

		// Materials are ready for processing (upload is synchronous)
		const ingestMaterials = materials.filter((m) => m.filePath);

		if (ingestMaterials.length === 0) {
			return NextResponse.json({ error: "No materials are ready for processing" }, { status: 400 });
		}

		// Update uploadStatus to completed
		await db
			.update(courseMaterials)
			.set({ uploadStatus: "completed" })
			.where(
				inArray(
					courseMaterials.id,
					ingestMaterials.map((m) => m.id)
				)
			);

		if (body.generationConfig) {
			const { saveCourseWeekGenerationConfig } = await import(
				"@/lib/services/adaptive-generation-service"
			);

			// Save config for the course week
			const configSaveResult = await saveCourseWeekGenerationConfig(
				body.weekId,
				body.courseId,
				user.id,
				body.generationConfig
			);

			if (!configSaveResult) {
				console.error(`Failed to save generation config for week ${body.weekId}`);
				// Continue with processing - config save failure shouldn't block processing
			}
		}

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
