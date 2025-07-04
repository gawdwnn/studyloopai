import { db } from "@/db";
import { type WeekContentGenerationMetadata, courseMaterials, courseWeeks } from "@/db/schema";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { generateFlashcards } from "./generate-flashcards";
import { generateGoldenNotes } from "./generate-golden-notes";
import { generateMCQs } from "./generate-mcqs";
import { generateOpenQuestions } from "./generate-open-questions";
import { generateSummaries } from "./generate-summaries";

const GenerateAiContentPayload = z.object({
	weekId: z.string().min(1, "Week ID is required"),
});

const GenerateAiContentOutput = z.object({
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

type GenerateAiContentPayloadType = z.infer<typeof GenerateAiContentPayload>;

export const generateAiContent = schemaTask({
	id: "generate-ai-content",
	schema: GenerateAiContentPayload,
	maxDuration: 600, // 10 minutes for orchestrating parallel content generation
	onStart: async ({ payload }: { payload: GenerateAiContentPayloadType }) => {
		logger.info("🚀 AI Content Generation orchestrator started", {
			weekId: payload.weekId,
		});
	},
	run: async (payload: GenerateAiContentPayloadType, { ctx: _ctx }) => {
		const { weekId } = payload;

		// Tag this run for enhanced observability
		await tags.add([`weekId:${payload.weekId}`, "phase:orchestration"]);

		try {
			// Validate that materials exist for this week and get the course week
			const materials = await db
				.select({
					id: courseMaterials.id,
					uploadedBy: courseMaterials.uploadedBy,
					courseId: courseMaterials.courseId,
				})
				.from(courseMaterials)
				.where(eq(courseMaterials.weekId, weekId));

			if (materials.length === 0) {
				throw new Error("No materials found for given week");
			}

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
			});

			// Trigger all content generation tasks in parallel using batchTrigger
			const contentGenerationTasks = [{ payload: { weekId } }];

			// Fire and forget - individual tasks will update their own status
			const [goldenNotesRun, flashcardsRun, mcqsRun, openQuestionsRun, summariesRun] =
				await Promise.all([
					generateGoldenNotes.batchTrigger(contentGenerationTasks),
					generateFlashcards.batchTrigger(contentGenerationTasks),
					generateMCQs.batchTrigger(contentGenerationTasks),
					generateOpenQuestions.batchTrigger(contentGenerationTasks),
					generateSummaries.batchTrigger(contentGenerationTasks),
				]);

			const contentBatchInfo = {
				goldenNotes: {
					batchId: goldenNotesRun.batchId,
				},
				flashcards: {
					batchId: flashcardsRun.batchId,
				},
				mcqs: {
					batchId: mcqsRun.batchId,
				},
				openQuestions: {
					batchId: openQuestionsRun.batchId,
				},
				summaries: {
					batchId: summariesRun.batchId,
				},
			};

			logger.info("🚀 Content generation tasks triggered", {
				weekId,
				batchInfo: contentBatchInfo,
			});

			const results = [
				{
					contentType: "goldenNotes",
					success: true,
					generatedCount: 0,
					batchId: contentBatchInfo.goldenNotes.batchId,
				},
				{
					contentType: "flashcards",
					success: true,
					generatedCount: 0,
					batchId: contentBatchInfo.flashcards.batchId,
				},
				{
					contentType: "mcqs",
					success: true,
					generatedCount: 0,
					batchId: contentBatchInfo.mcqs.batchId,
				},
				{
					contentType: "openQuestions",
					success: true,
					generatedCount: 0,
					batchId: contentBatchInfo.openQuestions.batchId,
				},
				{
					contentType: "summaries",
					success: true,
					generatedCount: 0,
					batchId: contentBatchInfo.summaries.batchId,
				},
			];

			const successfulTriggers = results.filter((r) => r.success).length;
			const totalGenerated = 0; // Individual tasks will track their own counts

			// Update week-level metadata to indicate orchestration completed with tracking info
			const currentWeekMetadata =
				(courseWeek.contentGenerationMetadata as WeekContentGenerationMetadata) || {};
			const updatedWeekMetadata: WeekContentGenerationMetadata = {
				...currentWeekMetadata,
				totalMaterialsProcessed: materials.length,
				batchInfo: {
					goldenNotes: {
						batchId: contentBatchInfo.goldenNotes.batchId,
						status: "triggered",
					},
					flashcards: {
						batchId: contentBatchInfo.flashcards.batchId,
						status: "triggered",
					},
					mcqs: {
						batchId: contentBatchInfo.mcqs.batchId,
						status: "triggered",
					},
					openQuestions: {
						batchId: contentBatchInfo.openQuestions.batchId,
						status: "triggered",
					},
					summaries: {
						batchId: contentBatchInfo.summaries.batchId,
						status: "triggered",
					},
				},
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
				success: successfulTriggers === 5,
				weekId,
				results,
				totalGenerated,
				contentBatchInfo,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

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
	cleanup: async ({ payload }: { payload: GenerateAiContentPayloadType }) => {
		logger.info("🧹 AI content generation orchestrator cleanup complete", {
			weekId: payload.weekId,
		});
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: GenerateAiContentPayloadType;
		output: z.infer<typeof GenerateAiContentOutput>;
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
		payload: GenerateAiContentPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ AI content generation orchestration failed", {
			weekId: payload.weekId,
			error: errorMessage,
		});
	},
});
