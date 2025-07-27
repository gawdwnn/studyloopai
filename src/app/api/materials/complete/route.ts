"use server";

import { db } from "@/db";
import { configurationSource, courseMaterials, courseWeeks } from "@/db/schema";
import { initializeFeatureTracking } from "@/lib/actions/course-week-features";
import { persistSelectiveConfig } from "@/lib/actions/generation-config";
import { getServerClient } from "@/lib/supabase/server";
import { getUserFriendlyErrorMessage } from "@/lib/utils/error-messages";
import { SelectiveGenerationConfigSchema } from "@/lib/validation/generation-config";
import type { ingestCourseMaterials } from "@/trigger/ingest-course-materials";
import { tasks } from "@trigger.dev/sdk";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
	materialIds: z
		.array(z.string().uuid("Invalid material ID"))
		.min(1, "At least one material ID is required")
		.max(5, "Maximum 5 materials allowed per batch"),
	weekId: z.string().uuid("Invalid week ID"),
	courseId: z.string().uuid("Invalid course ID"),
	selectiveConfig: SelectiveGenerationConfigSchema,
	configSource: z.enum(configurationSource.enumValues),
});

export async function POST(req: NextRequest) {
	try {
		const json = await req.json();
		const body = BodySchema.parse(json);

		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user)
			return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

		// Ownership validation
		// Mark materials upload status as completed
		const updatedMaterials = await db
			.update(courseMaterials)
			.set({
				uploadStatus: "completed",
				updatedAt: new Date(),
			})
			.where(
				and(
					inArray(courseMaterials.id, body.materialIds),
					eq(courseMaterials.uploadedBy, user.id),
					eq(courseMaterials.courseId, body.courseId),
					eq(courseMaterials.weekId, body.weekId)
				)
			)
			.returning({
				id: courseMaterials.id,
				filePath: courseMaterials.filePath,
				contentType: courseMaterials.contentType,
			});

		if (updatedMaterials.length === 0) {
			return NextResponse.json(
				{ error: "No matching materials found or already completed" },
				{ status: 404 }
			);
		}

		// Mark course week as having materials
		await db
			.update(courseWeeks)
			.set({ hasMaterials: true })
			.where(
				and(
					eq(courseWeeks.id, body.weekId),
					eq(courseWeeks.courseId, body.courseId)
				)
			);

		// Persist the user's selected config to database
		const savedConfigId = await persistSelectiveConfig(
			body.selectiveConfig,
			body.weekId,
			body.courseId,
			user.id,
			body.configSource,
			{
				source: "material_upload_completion",
				trigger: "course_material_upload_wizard",
				userAgent: "material-upload-api",
			}
		);

		// Trigger ingest task for those materials
		const handle = await tasks.trigger<typeof ingestCourseMaterials>(
			"ingest-course-materials",
			{
				userId: user.id,
				materials: updatedMaterials.map((m) => ({
					materialId: m.id,
					filePath: m.filePath as string,
					contentType: m.contentType as string,
				})),
				configId: savedConfigId,
			}
		);

		// Initialize feature tracking
		await initializeFeatureTracking(body.courseId, body.weekId, savedConfigId);

		return NextResponse.json({
			success: true,
			runId: handle.id,
			publicAccessToken: handle.publicAccessToken,
		});
	} catch (err) {
		console.error("Materials completion error:", err);

		const userMessage = getUserFriendlyErrorMessage(
			err instanceof Error ? err : "Unknown error occurred"
		);

		return NextResponse.json({ error: userMessage }, { status: 400 });
	}
}
