import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { inArray } from "drizzle-orm";
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

// Type for the task's return value
type EmbeddingTaskOutput = {
	success: boolean;
	materialId: string;
	chunksCreated?: number;
	textLength?: number;
	contentType?: string;
};

// Type for batch run results from batchTriggerAndWait
type EmbeddingRun = {
	ok: boolean;
	id: string;
	output?: EmbeddingTaskOutput;
	error?: string;
};

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
	run: async (payload: IngestBatchPayloadType) => {
		// Add contextual tags for observability
		await tags.add([`userId:${payload.userId}`, "phase:ingest"]);

		const { userId, materials } = payload;

		logger.info("📥 Ingest batch started", {
			userId,
			materialCount: materials.length,
		});

		// Fan-out: process & embed each material in parallel (queue limited inside the task definition)
		const embeddingItems = materials.map((m) => ({
			payload: {
				materialId: m.materialId,
				filePath: m.filePath,
				contentType: m.contentType,
			},
		}));

		const embeddingResult =
			await processAndEmbedIndividualMaterial.batchTriggerAndWait(
				embeddingItems,
				{}
			);
			
		const embeddingRuns = embeddingResult.runs as EmbeddingRun[];

		for (const run of embeddingRuns) {
			if (!run.ok) {
				throw new Error(`Embedding failed for run ${run.id}: ${run.error}`);
			}
		}

		logger.info("🧩 All embeddings complete, triggering AI generation", {
			userId,
			completedCount: embeddingResult.runs.length,
		});

		// Extract material IDs from successful runs
		const materialIds = embeddingRuns
			.filter(
				(r): r is EmbeddingRun & { output: EmbeddingTaskOutput } =>
					r.ok && r.output !== undefined
			)
			.map((r) => r.output.materialId);

		// Get the weekId and courseId - all materials in a batch should belong to the same week and course
		const courseMaterialsRows = await db
      .select({
        weekId: courseMaterials.weekId,
        courseId: courseMaterials.courseId,
      })
      .from(courseMaterials)
      .where(inArray(courseMaterials.id, materialIds));

		// Validate that all materials belong to the same week and course
		const weekIds = Array.from(
			new Set(courseMaterialsRows.map((r) => r.weekId).filter(Boolean))
		) as string[];
		const courseIds = Array.from(
			new Set(courseMaterialsRows.map((r) => r.courseId).filter(Boolean))
		) as string[];

		if (weekIds.length === 0) {
			throw new Error("No weekId associated with processed materials");
		}

		if (courseIds.length === 0) {
			throw new Error("No courseId associated with processed materials");
		}

		if (weekIds.length > 1) {
			throw new Error(
				`Materials belong to multiple weeks: ${weekIds.join(", ")}. Expected single week.`
			);
		}

		if (courseIds.length > 1) {
			throw new Error(
				`Materials belong to multiple courses: ${courseIds.join(", ")}. Expected single course.`
			);
		}

		const weekId = weekIds[0];
		const courseId = courseIds[0];

		logger.info("🧩 All embeddings complete, triggering AI generation", {
			userId,
			materialIds,
			weekId,
			courseId,
			configId: payload.configId,
		});

		// Trigger AI content generation for the course week with validated material IDs
		await aiContentOrchestrator.trigger({
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
