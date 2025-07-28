import { updateGenerationConfigStatus } from "@/lib/services/background-job-db-service";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";
import { generateConceptMaps } from "./generate-concept-maps";
import { generateCuecards } from "./generate-cuecards";
import { generateGoldenNotes } from "./generate-golden-notes";
import { generateMCQs } from "./generate-mcqs";
import { generateOpenQuestions } from "./generate-open-questions";
import { generateSummaries } from "./generate-summaries";

const AiContentOrchestratorPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
	courseId: z.string().min(1, "Course ID is required"),
	materialIds: z
		.array(z.string().uuid())
		.min(1, "At least one material ID is required"),
	configId: z.string().uuid().optional(),
});

const AiContentOrchestratorOutput = z.object({
	success: z.boolean(),
	results: z.array(
		z.object({
			contentType: z.string(),
			success: z.boolean(),
			generatedCount: z.number(),
			batchId: z.string().optional(),
			error: z.string().optional(),
		})
	),
});

type AiContentOrchestratorPayloadType = z.infer<
	typeof AiContentOrchestratorPayload
>;

export const aiContentOrchestrator = schemaTask({
	id: "ai-content-orchestrator",
	schema: AiContentOrchestratorPayload,
	maxDuration: 600, // 10 minutes for orchestrating parallel content generation
	onStart: async ({
		payload,
	}: {
		payload: AiContentOrchestratorPayloadType;
	}) => {
		logger.info("🚀 AI Content Generation orchestrator started", {
			weekId: payload.weekId,
			courseId: payload.courseId,
			configId: payload.configId,
			materialIds: payload.materialIds,
		});
	},
	run: async (payload: AiContentOrchestratorPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, materialIds, configId } = payload;

		await tags.add([
			`weekId:${payload.weekId}`,
			`courseId:${payload.courseId}`,
			`configId:${payload.configId}`,
			"phase:orchestration",
		]);

		try {
			if (!configId) {
				throw new Error("Configuration ID is required for content generation");
			}

			await updateGenerationConfigStatus(configId, "processing", {
				generationStartedAt: new Date(),
			});

			logger.info("🔄 Updated generation config status to processing", {
				configId,
				weekId,
			});

			const batchRuns: Record<string, { batchId: string } | undefined> = {};

			// Fetch the configuration to determine which features to generate
			const { getGenerationConfigById } = await import(
				"@/lib/actions/generation-config"
			);
			const selectiveConfig = await getGenerationConfigById(configId);

			if (!selectiveConfig) {
				throw new Error("Configuration not found or inactive");
			}

			if (selectiveConfig.selectedFeatures.goldenNotes) {
				batchRuns.goldenNotes = await generateGoldenNotes.batchTrigger([
					{
						payload: { weekId, courseId, materialIds, configId },
					},
				]);
			}

			if (selectiveConfig.selectedFeatures.cuecards) {
				batchRuns.cuecards = await generateCuecards.batchTrigger([
					{
						payload: { weekId, courseId, materialIds, configId },
					},
				]);
			}

			if (selectiveConfig.selectedFeatures.mcqs) {
				batchRuns.mcqs = await generateMCQs.batchTrigger([
					{
						payload: { weekId, courseId, materialIds, configId },
					},
				]);
			}

			if (selectiveConfig.selectedFeatures.openQuestions) {
				batchRuns.openQuestions = await generateOpenQuestions.batchTrigger([
					{
						payload: { weekId, courseId, materialIds, configId },
					},
				]);
			}

			if (selectiveConfig.selectedFeatures.summaries) {
				batchRuns.summaries = await generateSummaries.batchTrigger([
					{
						payload: { weekId, courseId, materialIds, configId },
					},
				]);
			}

			if (selectiveConfig.selectedFeatures.conceptMaps) {
				batchRuns.conceptMaps = await generateConceptMaps.batchTrigger([
					{
						payload: { weekId, courseId, materialIds, configId },
					},
				]);
			}

			const contentBatchInfo: { [key: string]: { batchId: string } } = {};

			// Build batch info for triggered tasks
			for (const [key, run] of Object.entries(batchRuns)) {
				if (run?.batchId) {
					contentBatchInfo[key] = { batchId: run.batchId };
				}
			}

			const results = Object.entries(contentBatchInfo).map(
				([contentType, info]) => ({
					contentType,
					success: true,
					generatedCount: 0,
					batchId: info.batchId,
				})
			);

			const successfulTriggers = results.filter((r) => r.success).length;

			await updateGenerationConfigStatus(configId, "completed", {
				generationCompletedAt: new Date(),
			});

			logger.info("✅ Updated generation config status to completed", {
				results,
			});

			return {
				success: successfulTriggers > 0,
				results,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";

			if (configId) {
				try {
					await updateGenerationConfigStatus(configId, "failed", {
						generationCompletedAt: new Date(),
						failedFeatures: [],
					});

					logger.error("❌ Updated generation config status to failed", {
						configId,
						weekId,
						error: errorMessage,
					});
				} catch (updateErr) {
					logger.error("Failed to update generation config status", {
						configId,
						originalError: errorMessage,
						updateError:
							updateErr instanceof Error ? updateErr.message : "Unknown",
					});
				}
			}

			logger.error("Content generation orchestration failed", {
				weekId,
				error: errorMessage,
			});

			throw error;
		}
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: AiContentOrchestratorPayloadType;
		output: z.infer<typeof AiContentOrchestratorOutput>;
	}) => {
		logger.info("✅ AI content generation orchestration completed", {
			weekId: payload.weekId,
			courseId: payload.courseId,
			configId: payload.configId,
			successfulTriggers: output.results.filter((r) => r.success).length,
			totalTasks: output.results.length,
		});
	},
	onFailure: async ({
		payload,
		error,
	}: {
		payload: AiContentOrchestratorPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ AI content generation orchestration failed", {
			weekId: payload.weekId,
			courseId: payload.courseId,
			configId: payload.configId,
			error: errorMessage,
		});
	},
});
