import { MCQsArraySchema, generateContent } from "@/lib/ai/generation";
import { insertMCQs } from "@/lib/services/persist-generated-content-service";
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
});

type GenerateMCQsPayloadType = z.infer<typeof GenerateMCQsPayload>;

export const generateMCQs = schemaTask({
	id: "generate-mcqs",
	schema: GenerateMCQsPayload,
	maxDuration: 300, // 5 minutes for individual content type
	run: async (payload: GenerateMCQsPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, materialIds, configId } = payload;

		await tags.add([
			`weekId:${payload.weekId}`,
			`courseId:${payload.courseId}`,
			"contentType:multipleChoice",
		]);

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
				courseId,
				mcqConfig,
			});

			const result = await generateContent({
				courseId,
				weekId,
				materialIds,
				config: mcqConfig,
				contentType: "multipleChoice",
				schema: MCQsArraySchema,
				insertFunction: insertMCQs,
				responseType: "array",
			});

			if (!result.success) {
				throw new Error(result.error || "MCQs generation failed");
			}

			return {
				success: true,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ MCQs generation failed", {
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
		output: z.infer<typeof GenerateMCQsOutput>;
	}) => {
		logger.info("✅ MCQs generation completed successfully", {
			success: output.success,
		});
	},
	onFailure: async ({ error }: { error: unknown }) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ MCQs generation failed permanently", {
			error: errorMessage,
		});
	},
});
