import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";

const GenerateOpenQuestionsPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
	courseId: z.string().min(1, "Course ID is required"),
	materialIds: z
		.array(z.string())
		.min(1, "At least one material ID is required"),
	configId: z.string().uuid("Config ID must be a valid UUID"),
});

const GenerateOpenQuestionsOutput = z.object({
	success: z.boolean(),
	weekId: z.string(),
	contentType: z.literal("openQuestions"),
	generatedCount: z.number(),
	error: z.string().optional(),
});

type GenerateOpenQuestionsPayloadType = z.infer<
	typeof GenerateOpenQuestionsPayload
>;

export const generateOpenQuestions = schemaTask({
	id: "generate-open-questions",
	schema: GenerateOpenQuestionsPayload,
	maxDuration: 300, // 5 minutes for individual content type
	onStart: async ({
		payload,
	}: { payload: GenerateOpenQuestionsPayloadType }) => {
		logger.info("📋 Open Questions generation task started", {
			weekId: payload.weekId,
		});
	},
	run: async (payload: GenerateOpenQuestionsPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, materialIds, configId } = payload;

		await tags.add([`weekId:${payload.weekId}`, "contentType:openQuestions"]);

		try {
			const { getFeatureGenerationConfig } = await import(
				"@/lib/actions/generation-config"
			);
			const openQuestionsConfig = await getFeatureGenerationConfig(
				configId,
				"openQuestions"
			);

			if (!openQuestionsConfig) {
				throw new Error(
					"Openquestions configuration not found or feature not enabled"
				);
			}
			logger.info("📋 Using selective configuration for open questions", {
				weekId,
				materialCount: materialIds.length,
				config: openQuestionsConfig,
			});

			const { generateOpenQuestionsForWeek } = await import(
				"@/lib/ai/content-generators"
			);

			const result = await generateOpenQuestionsForWeek(
				courseId,
				weekId,
				materialIds,
				openQuestionsConfig
			);

			if (!result.success) {
				throw new Error(result.error || "Open questions generation failed");
			}

			return {
				success: true,
				weekId,
				contentType: "openQuestions" as const,
				generatedCount: result.generatedCount || 0,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ Open questions generation failed", {
				weekId,
				error: errorMessage,
			});
			throw error;
		}
	},
	cleanup: async ({
		payload,
	}: { payload: GenerateOpenQuestionsPayloadType }) => {
		logger.info("🧹 Open questions generation task cleanup complete", {
			weekId: payload.weekId,
		});
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: GenerateOpenQuestionsPayloadType;
		output: z.infer<typeof GenerateOpenQuestionsOutput>;
	}) => {
		logger.info("✅ Open questions generation completed successfully", {
			weekId: payload.weekId,
			generatedCount: output.generatedCount,
		});

		const { updateWeekContentGenerationMetadata } = await import(
			"@/lib/services/processing-metadata-service"
		);
		await updateWeekContentGenerationMetadata(
			payload.weekId,
			"openQuestions",
			output.generatedCount,
			logger
		);
	},
	onFailure: async ({
		payload,
		error,
	}: {
		payload: GenerateOpenQuestionsPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ Open questions generation failed permanently", {
			weekId: payload.weekId,
			error: errorMessage,
		});
	},
});
