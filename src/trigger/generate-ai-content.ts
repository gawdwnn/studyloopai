import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";

const GenerateAiContentPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
});

const GenerateAiContentOutput = z.object({
	success: z.boolean(),
	weekId: z.string(),
	error: z.string().optional(),
});

type GenerateAiContentPayloadType = z.infer<typeof GenerateAiContentPayload>;

export const generateAiContent = schemaTask({
	id: "generate-ai-content",
	schema: GenerateAiContentPayload,
	maxDuration: 900, // Allow up to 15 minutes for complex multi-step AI content generation
	onStart: async ({ payload }: { payload: GenerateAiContentPayloadType }) => {
		logger.info("🚀 AI Content Generation task started", {
			weekId: payload.weekId,
		});
	},
	run: async (payload: GenerateAiContentPayloadType, { ctx }) => {
		const { weekId } = payload;

		// @ts-expect-error
		ctx.run.setTags({ weekId: payload.weekId, phase: "generation" });

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
			const { getEffectiveGenerationConfig, saveAdaptiveGenerationConfig } = await import(
				"@/lib/services/generation-config-service"
			);

			// Get the effective configuration with adaptive features
			const adaptiveConfig = await getEffectiveGenerationConfig(userId, materials[0].id, courseId);

			// Save the adaptive configuration to the dedicated table
			await saveAdaptiveGenerationConfig(materials[0].id, userId, adaptiveConfig);

			logger.info("🎯 Using adaptive configuration", {
				weekId,
				config: adaptiveConfig,
				adaptationReason: adaptiveConfig.adaptationReason,
			});

			// Import dynamically new week generator
			const { generateAllContentForWeek } = await import("@/lib/ai/content-generators");

			const materialIds = materials.map((m) => m.id);

			// Generate content aggregated for week
			const result = await generateAllContentForWeek(weekId, materialIds, adaptiveConfig);

			if (!result.success) {
				throw new Error(
					`Content generation failed: ${result.errors?.join(", ") || "Unknown error"}`
				);
			}

			const totalGenerated = result.totalGenerated;

			// Update each material's processingMetadata
			for (const mat of materials) {
				const updatedMetadata = {
					...(mat.processingMetadata as object),
					processingStatus: "completed",
					generationResults: {
						totalGenerated,
						generatedAt: new Date().toISOString(),
					},
				};

				await db
					.update(courseMaterials)
					.set({ processingMetadata: updatedMetadata })
					.where(eq(courseMaterials.id, mat.id));
			}

			return { success: true, weekId };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

			// Flag failure on all materials in week
			await db
				.update(courseMaterials)
				.set({
					processingMetadata: {
						processingStatus: "failed",
						error: errorMessage,
						failedAt: new Date().toISOString(),
					},
				})
				.where(eq(courseMaterials.weekId, weekId));

			throw error; // Let lifecycle handlers manage logging
		}
	},
	cleanup: async ({ payload }: { payload: GenerateAiContentPayloadType }) => {
		logger.info("🧹 AI content generation task cleanup complete", {
			weekId: payload.weekId,
		});
		// TODO: Clean up any temporary resources if needed
	},
	onSuccess: async ({
		payload,
	}: {
		payload: GenerateAiContentPayloadType;
		output: z.infer<typeof GenerateAiContentOutput>;
	}) => {
		logger.info("✅ AI content generation completed successfully", {
			weekId: payload.weekId,
		});
	},
	onFailure: async ({
		payload,
		error,
	}: {
		payload: GenerateAiContentPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ AI content generation failed permanently", {
			weekId: payload.weekId,
			error: errorMessage,
		});
	},
});
