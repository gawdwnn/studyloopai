import { generateContent } from "@/lib/ai/generation";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";

const GenerateSummariesPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
	courseId: z.string().min(1, "Course ID is required"),
	materialIds: z
		.array(z.string())
		.min(1, "At least one material ID is required"),
	configId: z.string().uuid("Config ID must be a valid UUID"),
	cacheKey: z.string().optional(), // Cache key for pre-fetched chunks
	userId: z.string().min(1, "User ID is required"),
});

const GenerateSummariesOutput = z.object({
	success: z.boolean(),
});

type GenerateSummariesPayloadType = z.infer<typeof GenerateSummariesPayload>;

export const generateSummaries = schemaTask({
	id: "generate-summaries",
	schema: GenerateSummariesPayload,
	maxDuration: 300, // 5 minutes for individual content type
	run: async (payload: GenerateSummariesPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, materialIds, configId, cacheKey, userId } =
			payload;

		await tags.add([
			`weekId:${payload.weekId}`,
			`courseId:${payload.courseId}`,
			"contentType:summaries",
		]);

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
			logger.info("Using selective configuration for summaries", {
				weekId,
				courseId,
				summariesConfig,
			});

			await generateContent({
				userId,
				contentType: "summaries",
				courseId,
				weekId,
				materialIds,
				config: summariesConfig,
				cacheKey,
			});

			return {
				success: true,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("Summaries generation failed", {
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
		output: z.infer<typeof GenerateSummariesOutput>;
	}) => {
		logger.info("Summaries generation completed successfully", {
			success: output.success,
		});
	},
	onFailure: async ({
		error,
		payload,
	}: { error: unknown; payload: GenerateSummariesPayloadType }) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("Summaries generation failed permanently", {
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
						feature: "summaries",
						timestamp: new Date(),
						retryCount: 0, // Get from trigger context if available
					},
				],
			});
		} catch (updateError) {
			logger.error("Failed to update summaries failure status in database", {
				configId: payload.configId,
				feature: "summaries",
				updateError:
					updateError instanceof Error
						? updateError.message
						: String(updateError),
			});
		}
	},
});
