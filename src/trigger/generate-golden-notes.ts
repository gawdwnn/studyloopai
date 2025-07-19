import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";

const GenerateGoldenNotesPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
	courseId: z.string().min(1, "Course ID is required"),
	materialIds: z
		.array(z.string())
		.min(1, "At least one material ID is required"),
	configId: z.string().uuid("Config ID must be a valid UUID"),
});

const GenerateGoldenNotesOutput = z.object({
	success: z.boolean(),
	weekId: z.string(),
	contentType: z.literal("goldenNotes"),
	generatedCount: z.number(),
	error: z.string().optional(),
});

type GenerateGoldenNotesPayloadType = z.infer<
	typeof GenerateGoldenNotesPayload
>;

export const generateGoldenNotes = schemaTask({
	id: "generate-golden-notes",
	schema: GenerateGoldenNotesPayload,
	maxDuration: 300, // 5 minutes for individual content type
	onStart: async ({ payload }: { payload: GenerateGoldenNotesPayloadType }) => {
		logger.info("📝 Golden Notes generation task started", {
			weekId: payload.weekId,
		});
	},
	run: async (payload: GenerateGoldenNotesPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, materialIds, configId } = payload;

		await tags.add([`weekId:${payload.weekId}`, "contentType:goldenNotes"]);

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
			logger.info("📝 Using selective configuration for golden notes", {
				weekId,
				materialCount: materialIds.length,
				config: goldenNotesConfig,
			});

			const { generateGoldenNotesForCourseWeek } = await import(
				"@/lib/ai/content-generators"
			);

			const result = await generateGoldenNotesForCourseWeek(
				courseId,
				weekId,
				materialIds,
				goldenNotesConfig
			);

			if (!result.success) {
				throw new Error(result.error || "Golden notes generation failed");
			}

			return {
				success: true,
				weekId,
				contentType: "goldenNotes" as const,
				generatedCount: result.generatedCount || 0,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ Golden notes generation failed", {
				weekId,
				error: errorMessage,
			});
			throw error;
		}
	},
	cleanup: async ({ payload }: { payload: GenerateGoldenNotesPayloadType }) => {
		logger.info("🧹 Golden notes generation task cleanup complete", {
			weekId: payload.weekId,
		});
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: GenerateGoldenNotesPayloadType;
		output: z.infer<typeof GenerateGoldenNotesOutput>;
	}) => {
		logger.info("✅ Golden notes generation completed successfully", {
			weekId: payload.weekId,
			generatedCount: output.generatedCount,
		});

		const { updateWeekContentGenerationMetadata } = await import(
			"@/lib/services/processing-metadata-service"
		);
		await updateWeekContentGenerationMetadata(
			payload.weekId,
			"goldenNotes",
			output.generatedCount,
			logger
		);
	},
	onFailure: async ({
		payload,
		error,
	}: {
		payload: GenerateGoldenNotesPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ Golden notes generation failed permanently", {
			weekId: payload.weekId,
			error: errorMessage,
		});
	},
});
