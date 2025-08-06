import { generateContent } from "@/lib/ai/generation";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";

const GenerateGoldenNotesPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
	courseId: z.string().min(1, "Course ID is required"),
	materialIds: z
		.array(z.string())
		.min(1, "At least one material ID is required"),
	configId: z.string().uuid("Config ID must be a valid UUID"),
	cacheKey: z.string().optional(), // Cache key for pre-fetched chunks
});

const GenerateGoldenNotesOutput = z.object({
	success: z.boolean(),
});

type GenerateGoldenNotesPayloadType = z.infer<
	typeof GenerateGoldenNotesPayload
>;

export const generateGoldenNotes = schemaTask({
	id: "generate-golden-notes",
	schema: GenerateGoldenNotesPayload,
	maxDuration: 300, // 5 minutes for individual content type
	run: async (payload: GenerateGoldenNotesPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, materialIds, configId, cacheKey } = payload;

		await tags.add([
			`weekId:${payload.weekId}`,
			`courseId:${payload.courseId}`,
			"contentType:goldenNotes",
		]);

		try {
			const { getFeatureGenerationConfig } = await import(
				"@/lib/actions/generation-config"
			);
			const goldenNotesConfig = await getFeatureGenerationConfig(
				configId,
				"goldenNotes"
			);

			if (!goldenNotesConfig) {
				throw new Error(
					"Golden notes configuration not found or feature not enabled"
				);
			}
			logger.info("Using selective configuration for golden notes", {
				weekId,
				courseId,
				goldenNotesConfig,
				materialCount: materialIds.length,
			});

			await generateContent({
				contentType: "goldenNotes",
				courseId,
				weekId,
				materialIds,
				config: goldenNotesConfig,
				cacheKey,
			});

			return {
				success: true,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("Golden notes generation failed", {
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
		payload: GenerateGoldenNotesPayloadType;
		output: z.infer<typeof GenerateGoldenNotesOutput>;
	}) => {
		logger.info("Golden notes generation completed successfully", {
			success: output.success,
		});
	},
	onFailure: async ({
		error,
	}: {
		payload: GenerateGoldenNotesPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("Golden notes generation failed permanently", {
			error: errorMessage,
		});
	},
});
