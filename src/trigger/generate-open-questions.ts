import { generateContent } from "@/lib/ai/generation";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";

const GenerateOpenQuestionsPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
	courseId: z.string().min(1, "Course ID is required"),
	materialIds: z
		.array(z.string())
		.min(1, "At least one material ID is required"),
	configId: z.string().uuid("Config ID must be a valid UUID"),
	cacheKey: z.string().optional(), // Cache key for pre-fetched chunks
	userId: z.string().min(1, "User ID is required"),
});

const GenerateOpenQuestionsOutput = z.object({
	success: z.boolean(),
});

type GenerateOpenQuestionsPayloadType = z.infer<
	typeof GenerateOpenQuestionsPayload
>;

export const generateOpenQuestions = schemaTask({
	id: "generate-open-questions",
	schema: GenerateOpenQuestionsPayload,
	maxDuration: 300, // 5 minutes for individual content type
	run: async (payload: GenerateOpenQuestionsPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, materialIds, configId, cacheKey, userId } =
			payload;

		await tags.add([
			`weekId:${payload.weekId}`,
			`courseId:${payload.courseId}`,
			"contentType:openQuestions",
		]);

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
			logger.info("Using selective configuration for open questions", {
				weekId,
				courseId,
				openQuestionsConfig,
			});

			await generateContent({
				userId,
				contentType: "openQuestions",
				courseId,
				weekId,
				materialIds,
				config: openQuestionsConfig,
				cacheKey,
			});

			return {
				success: true,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("Open questions generation failed", {
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
		output: z.infer<typeof GenerateOpenQuestionsOutput>;
	}) => {
		logger.info("Open questions generation completed successfully", {
			success: output.success,
		});
	},
	onFailure: async ({ error }: { error: unknown }) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("Open questions generation failed permanently", {
			error: errorMessage,
		});
	},
});
