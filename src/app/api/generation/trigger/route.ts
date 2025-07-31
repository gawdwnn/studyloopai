/**
 * On-Demand Generation API
 *
 * Triggers generation for specific content types when users need them
 * for immediate session startup
 */

import { db } from "@/db";
import { configurationSource, courseMaterials, courseWeeks } from "@/db/schema";
import { initializeFeatureTracking } from "@/lib/actions/course-week-features";
import { persistSelectiveConfig } from "@/lib/actions/generation-config";
import { getServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { SelectiveGenerationConfigSchema } from "@/lib/validation/generation-config";
import { tasks } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TriggerGenerationSchema = z.object({
	courseId: z.string().uuid("Invalid course ID"),
	weekId: z.string().uuid("Invalid week ID"),
	featureTypes: z
		.array(
			z.enum([
				"goldenNotes",
				"cuecards",
				"mcqs",
				"openQuestions",
				"summaries",
				"conceptMaps",
			])
		)
		.min(1, "At least one content type is required"),
	config: SelectiveGenerationConfigSchema,
	configSource: z.enum(configurationSource.enumValues),
});

export async function POST(req: NextRequest) {
	try {
		const json = await req.json();
		const body = TriggerGenerationSchema.parse(json);

		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
		}

		// Get materials for this courseId and weekId, ensuring week has course materials
		const materials = await db
			.select({
				id: courseMaterials.id,
			})
			.from(courseMaterials)
			.innerJoin(courseWeeks, eq(courseWeeks.id, courseMaterials.weekId))
			.where(
				and(
					eq(courseMaterials.weekId, body.weekId),
					eq(courseMaterials.courseId, body.courseId),
					eq(courseMaterials.uploadedBy, user.id),
					eq(courseWeeks.hasMaterials, true)
				)
			);

		if (materials.length === 0) {
			return NextResponse.json(
				{ error: "No materials found for this course and week" },
				{ status: 400 }
			);
		}

		const selectiveConfig = body.config;

		// Persist the config to database with on-demand metadata
		const configId = await persistSelectiveConfig(
			selectiveConfig,
			body.weekId,
			body.courseId,
			user.id,
			body.configSource,
			{
				source: "on_demand_generation",
				trigger: "adaptive_learning_session_setup",
				userAgent: "on-demand-generation-api",
			}
		);

		// Trigger the AI content orchestrator
		const { aiContentOrchestrator } = await import(
			"@/trigger/ai-content-orchestrator"
		);

		const handle = await tasks.trigger(aiContentOrchestrator.id, {
			weekId: body.weekId,
			courseId: body.courseId,
			materialIds: materials.map((m) => m.id),
			configId,
		});

		// Initialize feature tracking
		await initializeFeatureTracking(body.courseId, body.weekId, configId);

		return NextResponse.json({
			success: true,
			runId: handle.id,
			publicAccessToken: handle.publicAccessToken,
		});
	} catch (error) {
		logger.error("On-demand generation trigger failed", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			route: "/api/generation/trigger",
			method: "POST",
		});

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}
