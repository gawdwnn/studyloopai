import { generateContent } from "@/lib/ai/generation";
import { OpenQuestionsArraySchema } from "@/lib/ai/generation/schemas";
import { insertOpenQuestions } from "@/lib/services/persist-generated-content-service";
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
});

type GenerateOpenQuestionsPayloadType = z.infer<
	typeof GenerateOpenQuestionsPayload
>;

export const generateOpenQuestions = schemaTask({
	id: "generate-open-questions",
	schema: GenerateOpenQuestionsPayload,
	maxDuration: 300, // 5 minutes for individual content type
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
				courseId,
				openQuestionsConfig,
			});

			const result = await generateContent({
				courseId,
				weekId,
				materialIds,
				config: openQuestionsConfig,
				contentType: "openQuestions",
				schema: OpenQuestionsArraySchema,
				insertFunction: insertOpenQuestions,
				responseType: "array",
			});

			if (!result.success) {
				throw new Error(result.error || "Open questions generation failed");
			}

			return {
				success: true,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ Open questions generation failed", {
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
		logger.info("✅ Open questions generation completed successfully", {
			success: output.success,
		});
	},
	onFailure: async ({ error }: { error: unknown }) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ Open questions generation failed permanently", {
			error: errorMessage,
		});
	},
});
