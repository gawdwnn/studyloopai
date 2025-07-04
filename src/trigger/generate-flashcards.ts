import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";

const GenerateFlashcardsPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
});

const GenerateFlashcardsOutput = z.object({
	success: z.boolean(),
	weekId: z.string(),
	contentType: z.literal("flashcards"),
	generatedCount: z.number(),
	error: z.string().optional(),
});

type GenerateFlashcardsPayloadType = z.infer<typeof GenerateFlashcardsPayload>;

export const generateFlashcards = schemaTask({
	id: "generate-flashcards",
	schema: GenerateFlashcardsPayload,
	maxDuration: 300, // 5 minutes for individual content type
	onStart: async ({ payload }: { payload: GenerateFlashcardsPayloadType }) => {
		logger.info("🃏 Flashcards generation task started", {
			weekId: payload.weekId,
		});
	},
	run: async (payload: GenerateFlashcardsPayloadType, { ctx: _ctx }) => {
		const { weekId } = payload;

		// Tag this run for enhanced observability
		await tags.add([`weekId:${payload.weekId}`, "contentType:flashcards"]);

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
			const { getEffectiveGenerationConfig } = await import(
				"@/lib/services/generation-config-service"
			);

			// Get the effective configuration with adaptive features
			const adaptiveConfig = await getEffectiveGenerationConfig(userId, materials[0].id, courseId);

			logger.info("🃏 Using adaptive configuration for flashcards", {
				weekId,
				config: adaptiveConfig,
			});

			// Import the specific generator
			const { generateFlashcardsForWeek } = await import("@/lib/ai/content-generators");

			const materialIds = materials.map((m) => m.id);

			// Generate flashcards for the week
			const result = await generateFlashcardsForWeek(weekId, materialIds, {
				flashcardsCount: adaptiveConfig.flashcardsCount,
				difficulty: adaptiveConfig.difficulty,
			});

			if (!result.success) {
				throw new Error(result.error || "Flashcards generation failed");
			}

			return {
				success: true,
				weekId,
				contentType: "flashcards" as const,
				generatedCount: result.generatedCount || 0,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ Flashcards generation failed", {
				weekId,
				error: errorMessage,
			});
			throw error;
		}
	},
	cleanup: async ({ payload }: { payload: GenerateFlashcardsPayloadType }) => {
		logger.info("🧹 Flashcards generation task cleanup complete", {
			weekId: payload.weekId,
		});
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: GenerateFlashcardsPayloadType;
		output: z.infer<typeof GenerateFlashcardsOutput>;
	}) => {
		logger.info("✅ Flashcards generation completed successfully", {
			weekId: payload.weekId,
			generatedCount: output.generatedCount,
		});

		// Dynamically import and call the shared utility
		const { updateWeekContentGenerationMetadata } = await import(
			"@/lib/services/processing-metadata-service"
		);
		await updateWeekContentGenerationMetadata(
			payload.weekId,
			"flashcards",
			output.generatedCount,
			logger
		);
	},
	onFailure: async ({
		payload,
		error,
	}: {
		payload: GenerateFlashcardsPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ Flashcards generation failed permanently", {
			weekId: payload.weekId,
			error: errorMessage,
		});
	},
});
