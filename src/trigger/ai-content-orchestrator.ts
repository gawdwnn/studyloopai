import { db } from "@/db";
import {
	type WeekContentGenerationMetadata,
	courseMaterials,
	courseWeeks,
} from "@/db/schema";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
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
	configId: z.string().uuid().optional(),
});

const AiContentOrchestratorOutput = z.object({
	success: z.boolean(),
	weekId: z.string(),
	results: z.array(
		z.object({
			contentType: z.string(),
			success: z.boolean(),
			generatedCount: z.number(),
			batchId: z.string().optional(),
			error: z.string().optional(),
		})
	),
	totalGenerated: z.number(),
	contentBatchInfo: z
		.record(
			z.object({
				batchId: z.string(),
			})
		)
		.optional(),
	error: z.string().optional(),
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
		});
	},
	run: async (payload: AiContentOrchestratorPayloadType, { ctx: _ctx }) => {
		const { weekId, courseId, configId } = payload;

		await tags.add([
			`weekId:${payload.weekId}`,
			`courseId:${payload.courseId}`,
			"phase:orchestration",
		]);

		try {
			// Validate that materials exist for this week and course
			const materials = await db
				.select({
					id: courseMaterials.id,
					uploadedBy: courseMaterials.uploadedBy,
					courseId: courseMaterials.courseId,
				})
				.from(courseMaterials)
				.where(eq(courseMaterials.weekId, weekId));

			if (materials.length === 0) {
				throw new Error("No materials found for given course week");
			}

			// Validate that all materials belong to the expected course
			const courseMismatch = materials.some((m) => m.courseId !== courseId);
			if (courseMismatch) {
				throw new Error(
					`Materials found for different course than expected: ${courseId}`
				);
			}

			// Extract material IDs to pass down to individual generators
			const materialIds = materials.map((m) => m.id);

			// Get the course week for metadata updates
			const [courseWeek] = await db
				.select({
					id: courseWeeks.id,
					contentGenerationMetadata: courseWeeks.contentGenerationMetadata,
				})
				.from(courseWeeks)
				.where(eq(courseWeeks.id, weekId));

			if (!courseWeek) {
				throw new Error("Course week not found");
			}

			logger.info("🎯 Triggering parallel content generation", {
				weekId,
				materialCount: materials.length,
				configId,
			});

			if (!configId) {
				throw new Error("Configuration ID is required for content generation");
			}

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

			logger.info("🚀 Content generation tasks triggered", {
				weekId,
				batchInfo: contentBatchInfo,
			});

			const results = Object.entries(contentBatchInfo).map(
				([contentType, info]) => ({
					contentType,
					success: true,
					generatedCount: 0,
					batchId: info.batchId,
				})
			);

			const successfulTriggers = results.filter((r) => r.success).length;
			const totalGenerated = 0; // Individual tasks will track their own counts

			// Update week-level metadata to indicate orchestration completed with tracking info
			const currentWeekMetadata =
				(courseWeek.contentGenerationMetadata as WeekContentGenerationMetadata) ||
				{};

			// Build batch info dynamically for triggered tasks
			const batchInfo: WeekContentGenerationMetadata["batchInfo"] = {};

			if (batchRuns.goldenNotes?.batchId) {
				batchInfo.goldenNotes = {
					batchId: batchRuns.goldenNotes.batchId,
					status: "triggered",
				};
			}
			if (batchRuns.cuecards?.batchId) {
				batchInfo.cuecards = {
					batchId: batchRuns.cuecards.batchId,
					status: "triggered",
				};
			}
			if (batchRuns.mcqs?.batchId) {
				batchInfo.mcqs = {
					batchId: batchRuns.mcqs.batchId,
					status: "triggered",
				};
			}
			if (batchRuns.openQuestions?.batchId) {
				batchInfo.openQuestions = {
					batchId: batchRuns.openQuestions.batchId,
					status: "triggered",
				};
			}
			if (batchRuns.summaries?.batchId) {
				batchInfo.summaries = {
					batchId: batchRuns.summaries.batchId,
					status: "triggered",
				};
			}
			if (batchRuns.conceptMaps?.batchId) {
				batchInfo.conceptMaps = {
					batchId: batchRuns.conceptMaps.batchId,
					status: "triggered",
				};
			}

			const updatedWeekMetadata: WeekContentGenerationMetadata = {
				...currentWeekMetadata,
				totalMaterialsProcessed: materials.length,
				batchInfo,
				startedAt: new Date().toISOString(),
			};

			await db
				.update(courseWeeks)
				.set({
					contentGenerationStatus: "processing",
					contentGenerationMetadata: updatedWeekMetadata,
					contentGenerationTriggeredAt: new Date(),
				})
				.where(eq(courseWeeks.id, weekId));

			return {
				success: successfulTriggers > 0,
				weekId,
				results,
				totalGenerated,
				contentBatchInfo,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";

			// Update week-level status to indicate orchestration failure
			await db
				.update(courseWeeks)
				.set({
					contentGenerationStatus: "failed",
					contentGenerationMetadata: {
						errors: [errorMessage],
						partialSuccess: false,
					},
				})
				.where(eq(courseWeeks.id, weekId));

			throw error;
		}
	},
	cleanup: async ({
		payload,
	}: {
		payload: AiContentOrchestratorPayloadType;
	}) => {
		logger.info("🧹 AI content generation orchestrator cleanup complete", {
			weekId: payload.weekId,
		});
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
			error: errorMessage,
		});
	},
});
