import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";

const GenerateMCQsPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
	courseId: z.string().min(1, "Course ID is required"),
	materialIds: z
		.array(z.string())
		.min(1, "At least one material ID is required"),
	configId: z.string().uuid("Config ID must be a valid UUID"),
});

const GenerateMCQsOutput = z.object({
	success: z.boolean(),
	weekId: z.string(),
	contentType: z.literal("multipleChoice"),
	generatedCount: z.number(),
	error: z.string().optional(),
});

type GenerateMCQsPayloadType = z.infer<typeof GenerateMCQsPayload>;

export const generateMCQs = schemaTask({
	id: "generate-mcqs",
	schema: GenerateMCQsPayload,
	maxDuration: 300, // 5 minutes for individual content type
	onStart: async ({ payload }: { payload: GenerateMCQsPayloadType }) => {
		logger.info("❓ MCQs generation task started", {
			weekId: payload.weekId,
		});
	},
	run: async (payload: GenerateMCQsPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, materialIds, configId } = payload;

		await tags.add([`weekId:${payload.weekId}`, "contentType:multipleChoice"]);

		try {
			const { getFeatureGenerationConfig } = await import(
				"@/lib/actions/generation-config"
			);
			const mcqConfig = await getFeatureGenerationConfig(configId, "mcqs");

			if (!mcqConfig) {
				throw new Error("Mcqs configuration not found or feature not enabled");
			}
			logger.info("❓ Using selective configuration for MCQs", {
				weekId,
				materialCount: materialIds.length,
				config: mcqConfig,
			});

			const { generateMCQsForWeek } = await import(
				"@/lib/ai/content-generators"
			);

			const result = await generateMCQsForWeek(
				courseId,
				weekId,
				materialIds,
				mcqConfig
			);

			if (!result.success) {
				throw new Error(result.error || "MCQs generation failed");
			}

			return {
				success: true,
				weekId,
				contentType: "multipleChoice" as const,
				generatedCount: result.generatedCount || 0,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ MCQs generation failed", {
				weekId,
				error: errorMessage,
			});
			throw error;
		}
	},
	cleanup: async ({ payload }: { payload: GenerateMCQsPayloadType }) => {
		logger.info("🧹 MCQs generation task cleanup complete", {
			weekId: payload.weekId,
		});
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: GenerateMCQsPayloadType;
		output: z.infer<typeof GenerateMCQsOutput>;
	}) => {
		logger.info("✅ MCQs generation completed successfully", {
			weekId: payload.weekId,
			generatedCount: output.generatedCount,
		});

		const { updateWeekContentGenerationMetadata } = await import(
			"@/lib/services/processing-metadata-service"
		);
		await updateWeekContentGenerationMetadata(
			payload.weekId,
			"multipleChoice",
			output.generatedCount,
			logger
		);
	},
	onFailure: async ({
		payload,
		error,
	}: {
		payload: GenerateMCQsPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ MCQs generation failed permanently", {
			weekId: payload.weekId,
			error: errorMessage,
		});
	},
});
