import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";

const GenerateCuecardsPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
});

const GenerateCuecardsOutput = z.object({
	success: z.boolean(),
	weekId: z.string(),
	contentType: z.literal("cuecards"),
	generatedCount: z.number(),
	error: z.string().optional(),
});

type GenerateCuecardsPayloadType = z.infer<typeof GenerateCuecardsPayload>;

export const generateCuecards = schemaTask({
	id: "generate-cuecards",
	schema: GenerateCuecardsPayload,
	maxDuration: 300, // 5 minutes for individual content type
	onStart: async ({ payload }: { payload: GenerateCuecardsPayloadType }) => {
		logger.info("🃏 Cuecards generation task started", {
			weekId: payload.weekId,
		});
	},
	run: async (payload: GenerateCuecardsPayloadType, { ctx: _ctx }) => {
		const { weekId } = payload;

		// Tag this run for enhanced observability
		await tags.add([`weekId:${payload.weekId}`, "contentType:cuecards"]);

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
			const { getEffectiveGenerationConfig } = await import(
				"@/lib/services/generation-config-service"
			);

			// Get the effective configuration with adaptive features
			const adaptiveConfig = await getEffectiveGenerationConfig(userId, materials[0].id, courseId);

			logger.info("🃏 Using adaptive configuration for cuecards", {
				weekId,
				config: adaptiveConfig,
			});

			// Import the specific generator
			const { generateCuecardsForWeek } = await import("@/lib/ai/content-generators");

			const materialIds = materials.map((m) => m.id);

			// Generate cuecards for the week
			const result = await generateCuecardsForWeek(courseId, weekId, materialIds, {
				cuecardsCount: adaptiveConfig.cuecardsCount,
				difficulty: adaptiveConfig.difficulty,
			});

			if (!result.success) {
				throw new Error(result.error || "Cuecards generation failed");
			}

			return {
				success: true,
				weekId,
				contentType: "cuecards" as const,
				generatedCount: result.generatedCount || 0,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ Cuecards generation failed", {
				weekId,
				error: errorMessage,
			});
			throw error;
		}
	},
	cleanup: async ({ payload }: { payload: GenerateCuecardsPayloadType }) => {
		logger.info("🧹 Cuecards generation task cleanup complete", {
			weekId: payload.weekId,
		});
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: GenerateCuecardsPayloadType;
		output: z.infer<typeof GenerateCuecardsOutput>;
	}) => {
		logger.info("✅ Cuecards generation completed successfully", {
			weekId: payload.weekId,
			generatedCount: output.generatedCount,
		});

		// Dynamically import and call the shared utility
		const { updateWeekContentGenerationMetadata } = await import(
			"@/lib/services/processing-metadata-service"
		);
		await updateWeekContentGenerationMetadata(
			payload.weekId,
			"cuecards",
			output.generatedCount,
			logger
		);
	},
	onFailure: async ({
		payload,
		error,
	}: {
		payload: GenerateCuecardsPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ Cuecards generation failed permanently", {
			weekId: payload.weekId,
			error: errorMessage,
		});
	},
});
