import { ConceptMapSchema } from "@/lib/ai/generation";
import { generateContent } from "@/lib/ai/generation/generic-generator";
import { insertConceptMaps } from "@/lib/services/persist-generated-content-service";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";

const GenerateConceptMapsPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
	courseId: z.string().min(1, "Course ID is required"),
	materialIds: z
		.array(z.string())
		.min(1, "At least one material ID is required"),
	configId: z.string().uuid("Config ID must be a valid UUID"),
});

const GenerateConceptMapsOutput = z.object({
	success: z.boolean(),
});

type GenerateConceptMapsPayloadType = z.infer<
	typeof GenerateConceptMapsPayload
>;

export const generateConceptMaps = schemaTask({
	id: "generate-concept-maps",
	schema: GenerateConceptMapsPayload,
	maxDuration: 300, // 5 minutes for individual content type
	run: async (payload: GenerateConceptMapsPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, materialIds, configId } = payload;

		await tags.add([
			`weekId:${payload.weekId}`,
			`courseId:${payload.courseId}`,
			"contentType:conceptMaps",
		]);

		try {
			const { getFeatureGenerationConfig } = await import(
				"@/lib/actions/generation-config"
			);
			const conceptMapsConfig = await getFeatureGenerationConfig(
				configId,
				"conceptMaps"
			);

			if (!conceptMapsConfig) {
				throw new Error(
					"Conceptmaps configuration not found or feature not enabled"
				);
			}
			logger.info("🗺️ Using selective configuration for concept maps", {
				weekId,
				courseId,
				conceptMapsConfig,
			});

			const result = await generateContent({
				courseId,
				weekId,
				materialIds,
				config: conceptMapsConfig,
				contentType: "conceptMaps",
				schema: ConceptMapSchema,
				insertFunction: insertConceptMaps,
				responseType: "object",
				maxTokens: 4000,
			});

			if (!result.success) {
				throw new Error(result.error || "Concept maps generation failed");
			}

			return {
				success: true,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";
			logger.error("❌ Concept maps generation failed", {
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
		payload: GenerateConceptMapsPayloadType;
		output: z.infer<typeof GenerateConceptMapsOutput>;
	}) => {
		logger.info("✅ Concept maps generation completed successfully", {
			success: output.success,
		});
	},
	onFailure: async ({
		error,
	}: {
		payload: GenerateConceptMapsPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ Concept maps generation failed permanently", {
			error: errorMessage,
		});
	},
});
