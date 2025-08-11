import { generateContent } from "@/lib/ai/generation";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";

const GenerateMCQsPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
	courseId: z.string().min(1, "Course ID is required"),
	materialIds: z
		.array(z.string())
		.min(1, "At least one material ID is required"),
	configId: z.string().uuid("Config ID must be a valid UUID"),
	cacheKey: z.string().optional(), // Cache key for pre-fetched chunks
	userId: z.string().min(1, "User ID is required"),
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
		const { weekId, courseId, materialIds, configId, cacheKey, userId } =
			payload;

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
			logger.info("Using selective configuration for MCQs", {
				weekId,
				courseId,
				mcqConfig,
			});

			await generateContent({
				userId,
				contentType: "multipleChoice",
				courseId,
				weekId,
				materialIds,
				config: mcqConfig,
				cacheKey,
			});

			return {
				success: true,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("MCQs generation failed", {
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
		logger.info("MCQs generation completed successfully", {
			success: output.success,
		});
	},
	onFailure: async ({
		error,
		payload,
	}: { error: unknown; payload: GenerateMCQsPayloadType }) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("MCQs generation failed permanently", {
			error: errorMessage,
			weekId: payload.weekId,
			courseId: payload.courseId,
			configId: payload.configId,
		});

		// Track this specific feature failure in database
		try {
			const { updateGenerationConfigStatus } = await import(
				"@/lib/services/background-job-db-service"
			);
			await updateGenerationConfigStatus(payload.configId, "failed", {
				failedFeatures: [
					{
						feature: "mcqs",
						timestamp: new Date(),
						retryCount: 0, // Get from trigger context if available
					},
				],
			});
		} catch (updateError) {
			logger.error("Failed to update MCQs failure status in database", {
				configId: payload.configId,
				feature: "mcqs",
				updateError:
					updateError instanceof Error
						? updateError.message
						: String(updateError),
			});
		}
	},
});
