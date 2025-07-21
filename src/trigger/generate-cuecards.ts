import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";

const GenerateCuecardsPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
	courseId: z.string().min(1, "Course ID is required"),
	materialIds: z
		.array(z.string())
		.min(1, "At least one material ID is required"),
	configId: z.string().uuid("Config ID must be a valid UUID"),
});

const GenerateCuecardsOutput = z.object({
	success: z.boolean(),
});

type GenerateCuecardsPayloadType = z.infer<typeof GenerateCuecardsPayload>;

export const generateCuecards = schemaTask({
	id: "generate-cuecards",
	schema: GenerateCuecardsPayload,
	maxDuration: 300, // 5 minutes for individual content type
	run: async (payload: GenerateCuecardsPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, materialIds, configId } = payload;

		await tags.add([`weekId:${payload.weekId}`, "contentType:cuecards"]);

		try {
			const { getFeatureGenerationConfig } = await import(
				"@/lib/actions/generation-config"
			);
			const cuecardsConfig = await getFeatureGenerationConfig(
				configId,
				"cuecards"
			);

			if (!cuecardsConfig) {
				throw new Error(
					"Cuecards configuration not found or feature not enabled"
				);
			}
			logger.info("🃏 Using selective configuration for cuecards", {
        weekId,
        courseId,
        cuecardsConfig,
      });

			const { generateCuecardsForWeek } = await import(
				"@/lib/ai/content-generators"
			);

			const result = await generateCuecardsForWeek(
				courseId,
				weekId,
				materialIds,
				cuecardsConfig
			);

			if (!result.success) {
				throw new Error(result.error || "Cuecards generation failed");
			}

			return {
				success: true
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ Cuecards generation failed", {
				weekId,
				courseId,
				configId,
				error: errorMessage,
			});
			throw error;
		}
	},
	onSuccess: async ({
		output,
	}: {
		payload: GenerateCuecardsPayloadType;
		output: z.infer<typeof GenerateCuecardsOutput>;
	}) => {
		logger.info("✅ Cuecards generation completed successfully", {
			success: output.success,
		});
	},
	onFailure: async ({
		error,
	}: {
		payload: GenerateCuecardsPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ Cuecards generation failed permanently", {
			error: errorMessage,
		});
	},
});
