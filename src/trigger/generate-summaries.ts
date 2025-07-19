import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";

const GenerateSummariesPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
	courseId: z.string().min(1, "Course ID is required"),
	materialIds: z
		.array(z.string())
		.min(1, "At least one material ID is required"),
	configId: z.string().uuid("Config ID must be a valid UUID"),
});

const GenerateSummariesOutput = z.object({
	success: z.boolean(),
	weekId: z.string(),
	contentType: z.literal("summaries"),
	generatedCount: z.number(),
	error: z.string().optional(),
});

type GenerateSummariesPayloadType = z.infer<typeof GenerateSummariesPayload>;

export const generateSummaries = schemaTask({
	id: "generate-summaries",
	schema: GenerateSummariesPayload,
	maxDuration: 300, // 5 minutes for individual content type
	onStart: async ({ payload }: { payload: GenerateSummariesPayloadType }) => {
		logger.info("📄 Summaries generation task started", {
			weekId: payload.weekId,
		});
	},
	run: async (payload: GenerateSummariesPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, materialIds, configId } = payload;

		await tags.add([`weekId:${payload.weekId}`, "contentType:summaries"]);

		try {
			const { getFeatureGenerationConfig } = await import(
				"@/lib/actions/generation-config"
			);
			const summariesConfig = await getFeatureGenerationConfig(
				configId,
				"summaries"
			);

			if (!summariesConfig) {
				throw new Error(
					"Summaries configuration not found or feature not enabled"
				);
			}
			logger.info("📄 Using selective configuration for summaries", {
				weekId,
				materialCount: materialIds.length,
				config: summariesConfig,
			});

			const { generateSummariesForWeek } = await import(
				"@/lib/ai/content-generators"
			);

			const result = await generateSummariesForWeek(
				courseId,
				weekId,
				materialIds,
				summariesConfig
			);

			if (!result.success) {
				throw new Error(result.error || "Summaries generation failed");
			}

			return {
				success: true,
				weekId,
				contentType: "summaries" as const,
				generatedCount: result.generatedCount || 0,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ Summaries generation failed", {
				weekId,
				error: errorMessage,
			});
			throw error;
		}
	},
	cleanup: async ({ payload }: { payload: GenerateSummariesPayloadType }) => {
		logger.info("🧹 Summaries generation task cleanup complete", {
			weekId: payload.weekId,
		});
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: GenerateSummariesPayloadType;
		output: z.infer<typeof GenerateSummariesOutput>;
	}) => {
		logger.info("✅ Summaries generation completed successfully", {
			weekId: payload.weekId,
			generatedCount: output.generatedCount,
		});

		const { updateWeekContentGenerationMetadata } = await import(
			"@/lib/services/processing-metadata-service"
		);
		await updateWeekContentGenerationMetadata(
			payload.weekId,
			"summaries",
			output.generatedCount,
			logger
		);
	},
	onFailure: async ({
		payload,
		error,
	}: {
		payload: GenerateSummariesPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ Summaries generation failed permanently", {
			weekId: payload.weekId,
			error: errorMessage,
		});
	},
});
