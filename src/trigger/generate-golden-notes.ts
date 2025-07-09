import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";

const GenerateGoldenNotesPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
});

const GenerateGoldenNotesOutput = z.object({
	success: z.boolean(),
	weekId: z.string(),
	contentType: z.literal("goldenNotes"),
	generatedCount: z.number(),
	error: z.string().optional(),
});

type GenerateGoldenNotesPayloadType = z.infer<typeof GenerateGoldenNotesPayload>;

export const generateGoldenNotes = schemaTask({
	id: "generate-golden-notes",
	schema: GenerateGoldenNotesPayload,
	maxDuration: 300, // 5 minutes for individual content type
	onStart: async ({ payload }: { payload: GenerateGoldenNotesPayloadType }) => {
		logger.info("📝 Golden Notes generation task started", {
			weekId: payload.weekId,
		});
	},
	run: async (payload: GenerateGoldenNotesPayloadType, { ctx: _ctx }) => {
		const { weekId } = payload;

		// Tag this run for enhanced observability
		await tags.add([`weekId:${payload.weekId}`, "contentType:goldenNotes"]);

		try {
			// Fetch all materials belonging to this week
			const materials = await db
				.select({
					id: courseMaterials.id,
					uploadedBy: courseMaterials.uploadedBy,
					courseId: courseMaterials.courseId,
					processingMetadata: courseMaterials.processingMetadata,
				})
				.from(courseMaterials)
				.where(eq(courseMaterials.weekId, weekId));

			if (materials.length === 0) {
				throw new Error("No materials found for given week");
			}

			const { uploadedBy: userId, courseId } = materials[0];

			// Import generation config manager for adaptive configuration
			const { getEffectiveCourseWeekGenerationConfig } = await import(
				"@/lib/services/adaptive-generation-service"
			);

			// Get the effective configuration with adaptive features for this week
			const adaptiveConfig = await getEffectiveCourseWeekGenerationConfig(userId, weekId, courseId);

			logger.info("📝 Using adaptive configuration for golden notes", {
				weekId,
				config: adaptiveConfig,
			});

			// Import the specific generator
			const { generateGoldenNotesForWeek } = await import("@/lib/ai/content-generators");

			const materialIds = materials.map((m) => m.id);

			// Generate golden notes for the week
			const result = await generateGoldenNotesForWeek(courseId, weekId, materialIds, {
				goldenNotesCount: adaptiveConfig.goldenNotesCount,
				difficulty: adaptiveConfig.difficulty,
				focus: adaptiveConfig.focus,
			});

			if (!result.success) {
				throw new Error(result.error || "Golden notes generation failed");
			}

			return {
				success: true,
				weekId,
				contentType: "goldenNotes" as const,
				generatedCount: result.generatedCount || 0,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ Golden notes generation failed", {
				weekId,
				error: errorMessage,
			});
			throw error;
		}
	},
	cleanup: async ({ payload }: { payload: GenerateGoldenNotesPayloadType }) => {
		logger.info("🧹 Golden notes generation task cleanup complete", {
			weekId: payload.weekId,
		});
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: GenerateGoldenNotesPayloadType;
		output: z.infer<typeof GenerateGoldenNotesOutput>;
	}) => {
		logger.info("✅ Golden notes generation completed successfully", {
			weekId: payload.weekId,
			generatedCount: output.generatedCount,
		});

		// Dynamically import and call the shared utility
		const { updateWeekContentGenerationMetadata } = await import(
			"@/lib/services/processing-metadata-service"
		);
		await updateWeekContentGenerationMetadata(
			payload.weekId,
			"goldenNotes",
			output.generatedCount,
			logger
		);
	},
	onFailure: async ({
		payload,
		error,
	}: {
		payload: GenerateGoldenNotesPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ Golden notes generation failed permanently", {
			weekId: payload.weekId,
			error: errorMessage,
		});
	},
});
