import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { generateAiContent } from "./generate-ai-content";
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
});

type IngestBatchPayloadType = z.infer<typeof IngestBatchPayload>;

type EmbeddingRun = {
	ok: boolean;
	payload: {
		materialId: string;
	};
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
	run: async (payload: IngestBatchPayloadType, { ctx }) => {
		// @ts-expect-error
		ctx.run.setTags({ userId: payload.userId, phase: "ingest" });

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

		const embeddingResult = await processAndEmbedIndividualMaterial.batchTriggerAndWait(
			embeddingItems,
			{}
		);

		const embeddingRuns = embeddingResult.runs as unknown as EmbeddingRun[];

		for (const run of embeddingRuns) {
			if (!run.ok) {
				throw new Error(`Embedding failed for material ${run.payload.materialId}`);
			}
		}

		logger.info("🧩 All embeddings complete, triggering AI generation", {
			userId,
			completedCount: embeddingResult.runs.length,
		});

		// Fetch weekIds for the successfully processed materials
		const materialIds = embeddingRuns.map((r) => r.payload.materialId);

		const rows = await db
			.select({ weekId: courseMaterials.weekId })
			.from(courseMaterials)
			.where(inArray(courseMaterials.id, materialIds));

		// Deduplicate non-null weekIds
		const weekIds = Array.from(new Set(rows.map((r) => r.weekId).filter(Boolean))) as string[];

		if (weekIds.length === 0) {
			throw new Error("No weekId associated with processed materials");
		}

		// Fan-out generation once per week
		const generationItems = weekIds.map((weekId) => ({ payload: { weekId } }));

		await generateAiContent.batchTrigger(generationItems);

		return {
			success: true,
			materialCount: materials.length,
		};
	},
});
