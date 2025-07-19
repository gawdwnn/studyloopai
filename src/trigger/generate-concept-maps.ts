import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";

const GenerateConceptMapsPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
	courseId: z.string().min(1, "Course ID is required"),
	materialIds: z
		.array(z.string())
		.min(1, "At least one material ID is required"),
	configId: z.string().uuid("Config ID must be a valid UUID"),
});

const GenerateConceptMapsOutput = z.object({
	success: z.boolean(),
	weekId: z.string(),
	contentType: z.literal("conceptMaps"),
	generatedCount: z.number(),
	error: z.string().optional(),
});

type GenerateConceptMapsPayloadType = z.infer<
	typeof GenerateConceptMapsPayload
>;

export const generateConceptMaps = schemaTask({
	id: "generate-concept-maps",
	schema: GenerateConceptMapsPayload,
	maxDuration: 300, // 5 minutes for individual content type
	onStart: async ({ payload }: { payload: GenerateConceptMapsPayloadType }) => {
		logger.info("🗺️ Concept Maps generation task started", {
			weekId: payload.weekId,
		});
	},
	run: async (payload: GenerateConceptMapsPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, materialIds, configId } = payload;

		await tags.add([`weekId:${payload.weekId}`, "contentType:conceptMaps"]);

		try {
			const { getFeatureGenerationConfig } = await import(
				"@/lib/actions/generation-config"
			);
			const conceptMapsConfig = await getFeatureGenerationConfig(
				configId,
				"conceptMaps"
			);

			if (!conceptMapsConfig) {
				throw new Error(
					"Conceptmaps configuration not found or feature not enabled"
				);
			}
			logger.info("🗺️ Using selective configuration for concept maps", {
				weekId,
				materialCount: materialIds.length,
				config: conceptMapsConfig,
			});

			const { generateConceptMapsForWeek } = await import(
				"@/lib/ai/content-generators"
			);

			const result = await generateConceptMapsForWeek(
				courseId,
				weekId,
				materialIds,
				conceptMapsConfig
			);

			if (!result.success) {
				throw new Error(result.error || "Concept maps generation failed");
			}

			return {
				success: true,
				weekId,
				contentType: "conceptMaps" as const,
				generatedCount: result.generatedCount || 0,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ Concept maps generation failed", {
				weekId,
				error: errorMessage,
			});
			throw error;
		}
	},
	cleanup: async ({ payload }: { payload: GenerateConceptMapsPayloadType }) => {
		logger.info("🧹 Concept maps generation task cleanup complete", {
			weekId: payload.weekId,
		});
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: GenerateConceptMapsPayloadType;
		output: z.infer<typeof GenerateConceptMapsOutput>;
	}) => {
		logger.info("✅ Concept maps generation completed successfully", {
			weekId: payload.weekId,
			generatedCount: output.generatedCount,
		});

		const { updateWeekContentGenerationMetadata } = await import(
			"@/lib/services/processing-metadata-service"
		);
		await updateWeekContentGenerationMetadata(
			payload.weekId,
			"conceptMaps",
			output.generatedCount,
			logger
		);
	},
	onFailure: async ({
		payload,
		error,
	}: {
		payload: GenerateConceptMapsPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ Concept maps generation failed permanently", {
			weekId: payload.weekId,
			error: errorMessage,
		});
	},
});
