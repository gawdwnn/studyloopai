import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";

const GenerateOpenQuestionsPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
});

const GenerateOpenQuestionsOutput = z.object({
	success: z.boolean(),
	weekId: z.string(),
	contentType: z.literal("openQuestions"),
	generatedCount: z.number(),
	error: z.string().optional(),
});

type GenerateOpenQuestionsPayloadType = z.infer<typeof GenerateOpenQuestionsPayload>;

export const generateOpenQuestions = schemaTask({
	id: "generate-open-questions",
	schema: GenerateOpenQuestionsPayload,
	maxDuration: 300, // 5 minutes for individual content type
	onStart: async ({ payload }: { payload: GenerateOpenQuestionsPayloadType }) => {
		logger.info("📋 Open Questions generation task started", {
			weekId: payload.weekId,
		});
	},
	run: async (payload: GenerateOpenQuestionsPayloadType, { ctx: _ctx }) => {
		const { weekId } = payload;

		// Tag this run for enhanced observability
		await tags.add([`weekId:${payload.weekId}`, "contentType:openQuestions"]);

		try {
			// Fetch all materials belonging to this week
			const materials = await db
				.select({
					id: courseMaterials.id,
					uploadedBy: courseMaterials.uploadedBy,
					courseId: courseMaterials.courseId,
					processingMetadata: courseMaterials.processingMetadata,
				})
				.from(courseMaterials)
				.where(eq(courseMaterials.weekId, weekId));

			if (materials.length === 0) {
				throw new Error("No materials found for given week");
			}

			const { uploadedBy: userId, courseId } = materials[0];

			// Import generation config manager for adaptive configuration
			const { getEffectiveCourseWeekGenerationConfig } = await import(
				"@/lib/services/adaptive-generation-service"
			);

			// Get the effective configuration with adaptive features
			const adaptiveConfig = await getEffectiveCourseWeekGenerationConfig(userId, weekId, courseId);

			logger.info("📋 Using adaptive configuration for open questions", {
				weekId,
				config: adaptiveConfig,
			});

			// Import the specific generator
			const { generateOpenQuestionsForWeek } = await import("@/lib/ai/content-generators");

			const materialIds = materials.map((m) => m.id);

			// Generate open questions for the week
			const result = await generateOpenQuestionsForWeek(courseId, weekId, materialIds, {
				examExercisesCount: adaptiveConfig.examExercisesCount,
				difficulty: adaptiveConfig.difficulty,
			});

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
			const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ Open questions generation failed", {
				weekId,
				error: errorMessage,
			});
			throw error;
		}
	},
	cleanup: async ({ payload }: { payload: GenerateOpenQuestionsPayloadType }) => {
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

		// Dynamically import and call the shared utility
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
