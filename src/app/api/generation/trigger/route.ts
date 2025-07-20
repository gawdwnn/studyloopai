/**
 * On-Demand Generation API
 *
 * Triggers generation for specific content types when users need them
 * for immediate session startup
 */

import { db } from "@/db";
import { courseMaterials, courseWeeks } from "@/db/schema";
import { persistSelectiveConfig } from "@/lib/actions/generation-config";
import { getServerClient } from "@/lib/supabase/server";
import { SelectiveGenerationConfigSchema } from "@/lib/validation/generation-config";
import type { FeatureType } from "@/types/generation-types";
import { tasks } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TriggerGenerationSchema = z.object({
	courseId: z.string().uuid("Invalid course ID"),
	weekId: z.string().uuid("Invalid week ID"),
	contentTypes: z
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
	config: SelectiveGenerationConfigSchema.optional(),
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

		// Verify user owns the course and week
		const [week] = await db
			.select({
				id: courseWeeks.id,
				courseId: courseWeeks.courseId,
				userId: courseWeeks.userId,
				contentGenerationStatus: courseWeeks.contentGenerationStatus,
			})
			.from(courseWeeks)
			.where(
				and(
					eq(courseWeeks.id, body.weekId),
					eq(courseWeeks.courseId, body.courseId),
					eq(courseWeeks.userId, user.id)
				)
			);

		if (!week) {
			return NextResponse.json(
				{ error: "Course week not found or access denied" },
				{ status: 404 }
			);
		}

		// Check if generation is already in progress
		if (week.contentGenerationStatus === "processing") {
			return NextResponse.json(
				{ error: "Generation already in progress for this week" },
				{ status: 409 }
			);
		}

		// Get materials for this week
		const materials = await db
			.select({
				id: courseMaterials.id,
				uploadedBy: courseMaterials.uploadedBy,
				courseId: courseMaterials.courseId,
				uploadStatus: courseMaterials.uploadStatus,
			})
			.from(courseMaterials)
			.where(
				and(
					eq(courseMaterials.weekId, body.weekId),
					eq(courseMaterials.uploadedBy, user.id)
				)
			);

		if (materials.length === 0) {
			return NextResponse.json(
				{ error: "No materials found for this week" },
				{ status: 400 }
			);
		}

		// Check if materials are ready for processing
		const readyMaterials = materials.filter(
			(m) => m.uploadStatus === "completed"
		);
		if (readyMaterials.length === 0) {
			return NextResponse.json(
				{ error: "No materials are ready for generation" },
				{ status: 400 }
			);
		}

		// Create selective config for requested content types
		const selectiveConfig =
			body.config || createDefaultSelectiveConfig(body.contentTypes);

		// Validate that requested content types are enabled in config
		const enabledTypes = Object.entries(selectiveConfig.selectedFeatures)
			.filter(([_, enabled]) => enabled)
			.map(([type, _]) => type as FeatureType);

		const missingTypes = body.contentTypes.filter(
			(type) => !enabledTypes.includes(type)
		);
		if (missingTypes.length > 0) {
			return NextResponse.json(
				{
					error: `Content types not enabled in config: ${missingTypes.join(", ")}`,
				},
				{ status: 400 }
			);
		}

		// Persist the configuration
		const configId = await persistSelectiveConfig(
			selectiveConfig,
			body.weekId,
			body.courseId,
			user.id
		);

		// Trigger the AI content orchestrator
		const { aiContentOrchestrator } = await import(
			"@/trigger/ai-content-orchestrator"
		);

		const handle = await tasks.trigger(aiContentOrchestrator.id, {
			weekId: body.weekId,
			courseId: body.courseId,
			configId,
		});

		return NextResponse.json({
			success: true,
			runId: handle.id,
			publicAccessToken: handle.publicAccessToken,
			configId,
			contentTypes: body.contentTypes,
			materialCount: readyMaterials.length,
		});
	} catch (error) {
		console.error("On-demand generation trigger failed:", error);

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

/**
 * Create a default selective config for the requested content types
 */
function createDefaultSelectiveConfig(contentTypes: FeatureType[]) {
	const selectedFeatures = {
		goldenNotes: contentTypes.includes("goldenNotes"),
		cuecards: contentTypes.includes("cuecards"),
		mcqs: contentTypes.includes("mcqs"),
		openQuestions: contentTypes.includes("openQuestions"),
		summaries: contentTypes.includes("summaries"),
		conceptMaps: contentTypes.includes("conceptMaps"),
	};

	return {
		selectedFeatures,
		featureConfigs: {
			goldenNotes: selectedFeatures.goldenNotes
				? {
						count: 5,
						style: "comprehensive" as const,
						includeExamples: true,
						difficulty: "intermediate" as const,
					}
				: undefined,
			cuecards: selectedFeatures.cuecards
				? {
						count: 10,
						difficulty: "intermediate" as const,
						includeHints: false,
						style: "question_answer" as const,
					}
				: undefined,
			mcqs: selectedFeatures.mcqs
				? {
						count: 10,
						difficulty: "intermediate" as const,
						includeExplanations: true,
						questionStyle: "application" as const,
					}
				: undefined,
			openQuestions: selectedFeatures.openQuestions
				? {
						count: 5,
						difficulty: "intermediate" as const,
						includeRubric: true,
						questionType: "analytical" as const,
					}
				: undefined,
			summaries: selectedFeatures.summaries
				? {
						summaryType: "comprehensive" as const,
						maxWords: 300,
						includeKeyPoints: true,
						style: "academic" as const,
					}
				: undefined,
			conceptMaps: selectedFeatures.conceptMaps
				? {
						style: "hierarchical" as const,
						maxNodes: 15,
						includeDefinitions: true,
						complexity: "medium" as const,
					}
				: undefined,
		},
	};
}
