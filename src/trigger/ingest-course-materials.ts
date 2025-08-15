import { getCourseMaterialsByIds } from "@/lib/services/background-job-db-service";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";
import { aiContentOrchestrator } from "./ai-content-orchestrator";
import { processAndEmbedIndividualMaterial } from "./process-and-embed-individual-material";

const IngestBatchPayload = z.object({
	userId: z.string().min(1, "User ID is required"),
	materials: z.array(
		z.object({
			materialId: z.string(),
			filePath: z.string(),
			contentType: z.string(),
		})
	),
	configId: z.string().uuid().optional(),
});

type IngestBatchPayloadType = z.infer<typeof IngestBatchPayload>;

export const ingestCourseMaterials = schemaTask({
	id: "ingest-course-materials",
	schema: IngestBatchPayload,
	// queue ensures only a couple of batches per user concurrently
	queue: {
		name: "ingest-batch",
		concurrencyLimit: 2,
	},
	// Allow up to 30 minutes to safely ingest & embed large batches
	maxDuration: 1800,
	retry: {
		maxAttempts: 2, // Limited retries for batch orchestration
		factor: 2,
		minTimeoutInMs: 3000, // Longer delay for batch operations
		maxTimeoutInMs: 60000, // Longer max timeout for large batches
		randomize: true,
	},
	run: async (payload: IngestBatchPayloadType) => {
		// Add contextual tags for observability
		await tags.add([`userId:${payload.userId}`, "phase:ingest"]);

		const { userId, materials } = payload;

		// Fan-out: process & embed each material in parallel (queue limited inside the task definition)
		const embeddingItems = materials.map((m) => ({
			payload: {
				materialId: m.materialId,
				filePath: m.filePath,
				contentType: m.contentType,
				userId: userId,
			},
		}));

		const embeddingResult =
			await processAndEmbedIndividualMaterial.batchTriggerAndWait(
				embeddingItems,
				{}
			);

		logger.info("All embeddings complete, triggering AI generation", {
			embeddingResult,
		});

		// Extract material IDs from successful runs
		const materialIds: string[] = [];
		for (const run of embeddingResult.runs) {
			if (run.ok && run.output.success && run.output.materialId) {
				materialIds.push(run.output.materialId);
			}
		}

		const courseMaterialsRows = await getCourseMaterialsByIds(materialIds);

		// Validate that all materials belong to the same week and course
		const weekIds = [
			...new Set(courseMaterialsRows.map((r) => r.week_id).filter(Boolean)),
		];
		const courseIds = [
			...new Set(courseMaterialsRows.map((r) => r.course_id).filter(Boolean)),
		];

		if (!weekIds[0] || !courseIds[0]) {
			throw new Error("Missing weekId or courseId in processed materials");
		}

		if (weekIds.length > 1 || courseIds.length > 1) {
			throw new Error(
				`Materials must belong to single week/course. Found: weeks=${weekIds}, courses=${courseIds}`
			);
		}

		const weekId = weekIds[0];
		const courseId = courseIds[0];

		logger.info("All embeddings complete, triggering AI generation", {
			userId,
			materialIds,
			weekId,
			courseId,
			configId: payload.configId,
		});

		// Trigger AI content generation for the course week with validated material IDs
		await aiContentOrchestrator.trigger({
			userId,
			weekId,
			courseId,
			materialIds,
			configId: payload.configId,
		});

		return {
			success: true,
		};
	},
});
