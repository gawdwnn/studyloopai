import { db } from "@/db";
import { courseMaterials, documentChunks } from "@/db/schema";
import { CONTENT_TYPES } from "@/lib/constants/file-upload";
import { PDF_PROCESSING_LIMITS } from "@/lib/constants/pdf-processing";
import { generateEmbeddings } from "@/lib/embeddings/embedding-service";
import { parsePDF } from "@/lib/processing/pdf-parser";
import { downloadCourseMaterial, removeCourseMaterial } from "@/lib/supabase/storage";
import { logger, schemaTask, tasks } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import type { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { z } from "zod";

const ProcessAndEmbedIndividualPayload = z.object({
	materialId: z.string().min(1, "Material ID is required"),
	filePath: z.string().min(1, "File path is required"),
	contentType: z.string().min(1, "Content type is required"),
});

const ProcessAndEmbedIndividualOutput = z.object({
	success: z.boolean(),
	materialId: z.string(),
	chunksCreated: z.number().optional(),
	textLength: z.number().optional(),
	contentType: z.string().optional(),
	error: z.string().optional(),
});

type ProcessAndEmbedIndividualPayloadType = z.infer<typeof ProcessAndEmbedIndividualPayload>;

export const processAndEmbedIndividualMaterial = schemaTask({
	id: "process-and-embed-individual-material",
	schema: ProcessAndEmbedIndividualPayload,
	maxDuration: 900, // Allow up to 15 minutes for processing & embedding very large materials
	retry: {
		maxAttempts: 3,
		factor: 2,
		minTimeoutInMs: 1000,
		maxTimeoutInMs: 10000,
		randomize: true,
	},
	onStart: async ({
		payload,
	}: {
		payload: ProcessAndEmbedIndividualPayloadType;
	}) => {
		logger.info("📄 Material processing task started", {
			materialId: payload.materialId,
			filePath: payload.filePath,
			contentType: payload.contentType,
		});

		// Update material status to indicate processing has started
		await db
			.update(courseMaterials)
			.set({
				processingMetadata: {
					processingStatus: "starting",
					startedAt: new Date().toISOString(),
				},
			})
			.where(eq(courseMaterials.id, payload.materialId));
	},
	run: async (payload: ProcessAndEmbedIndividualPayloadType, { ctx }) => {
		const { materialId, filePath, contentType } = payload;

		// @ts-expect-error - setTags available at runtime
		ctx.run.setTags({ materialId: payload.materialId, phase: "embedding" });

		try {
			// 1. Update status to 'processing'
			await db
				.update(courseMaterials)
				.set({
					processingMetadata: {
						processingStatus: "processing",
						extractedText: false,
						chunkingCompleted: false,
						embeddingCompleted: false,
					},
					embeddingStatus: "processing",
					processingStartedAt: new Date(),
				})
				.where(eq(courseMaterials.id, materialId));

			// 2. Download and parse single file
			const downloadResult = await downloadCourseMaterial(filePath);

			if (!downloadResult.success) {
				throw new Error(downloadResult.error || `Failed to download ${filePath}`);
			}

			if (!downloadResult.buffer) {
				throw new Error(`No data received for file: ${filePath}`);
			}

			const buffer = downloadResult.buffer;

			let extractedText = "";
			let contentMetadata = {};

			// 3. Process based on content type (v1: PDF only)
			if (contentType === CONTENT_TYPES.PDF) {
				const pdfResult = await parsePDF(buffer, {
					cleanText: true,
					timeout: PDF_PROCESSING_LIMITS.MAX_PROCESSING_TIMEOUT,
				});

				if (pdfResult.success && pdfResult.text && pdfResult.text.trim()) {
					extractedText = pdfResult.text;
					contentMetadata = {
						pageCount: pdfResult.metadata?.pageCount,
						processingTime: pdfResult.metadata?.processingTime,
						extractionMethod: pdfResult.metadata?.extractionMethod,
					};
				} else {
					throw new Error(
						`Failed to extract text from PDF: ${filePath}. Error: ${pdfResult.error}`
					);
				}
			} else {
				// Future: Handle other content types (video, audio, image, weblink)
				throw new Error(
					`Content type '${contentType}' is not yet supported. Currently only PDF processing is implemented.`
				);
			}

			if (!extractedText.trim()) {
				throw new Error(
					`No text could be extracted from file: ${filePath}. Please ensure the file contains readable text content.`
				);
			}

			// 4. Update material with extracted text status and metadata
			await db
				.update(courseMaterials)
				.set({
					contentMetadata: contentMetadata,
					processingMetadata: {
						processingStatus: "processing",
						extractedText: true,
						chunkingCompleted: false,
						embeddingCompleted: false,
					},
				})
				.where(eq(courseMaterials.id, materialId));

			// 5. Chunk text
			const splitter = new RecursiveCharacterTextSplitter({
				chunkSize: PDF_PROCESSING_LIMITS.CHUNK_SIZE,
				chunkOverlap: PDF_PROCESSING_LIMITS.CHUNK_OVERLAP,
			});
			const chunks = await splitter.createDocuments([extractedText]);

			// 6. Update chunking completion
			await db
				.update(courseMaterials)
				.set({
					processingMetadata: {
						processingStatus: "processing",
						extractedText: true,
						chunkingCompleted: true,
						embeddingCompleted: false,
					},
				})
				.where(eq(courseMaterials.id, materialId));

			// 7. Generate embeddings
			const result = await generateEmbeddings(chunks.map((c: Document) => c.pageContent));
			if (!result.success) {
				throw new Error(`Embedding generation failed: ${result.error}`);
			}

			// 8. Save chunks to database
			const chunksToInsert = result.embeddings.map((embedding: number[], i: number) => ({
				materialId: materialId,
				content: chunks[i].pageContent,
				embedding: embedding,
				chunkIndex: i,
				tokenCount: Math.round(chunks[i].pageContent.length / 4),
			}));
			await db.insert(documentChunks).values(chunksToInsert);

			// 9. Update final status to 'completed'
			const completedAt = new Date();

			await db
				.update(courseMaterials)
				.set({
					embeddingStatus: "completed",
					totalChunks: chunks.length,
					embeddedChunks: chunks.length,
					processingCompletedAt: completedAt,
					processingMetadata: {
						processingStatus: "completed",
						extractedText: true,
						chunkingCompleted: true,
						embeddingCompleted: true,
					},
				})
				.where(eq(courseMaterials.id, materialId));

			return {
				success: true,
				materialId,
				chunksCreated: chunks.length,
				textLength: extractedText.length,
				contentType: contentType,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

			await db
				.update(courseMaterials)
				.set({
					processingMetadata: {
						processingStatus: "failed",
						error: errorMessage,
					},
					embeddingStatus: "failed",
					processingCompletedAt: new Date(),
				})
				.where(eq(courseMaterials.id, materialId));

			throw error; // Let lifecycle handlers manage logging
		}
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: ProcessAndEmbedIndividualPayloadType;
		output: z.infer<typeof ProcessAndEmbedIndividualOutput>;
	}) => {
		logger.info("✅ Material processing completed successfully", {
			materialId: payload.materialId,
			filePath: payload.filePath,
			contentType: payload.contentType,
			chunksCreated: output.chunksCreated,
			textLength: output.textLength,
		});
		// TODO: Send success notification/webhook
		// Trigger AI content generation task
		await tasks.trigger("generate-ai-content", {
			materialId: payload.materialId,
		});
	},
	cleanup: async ({
		payload,
	}: {
		payload: ProcessAndEmbedIndividualPayloadType;
	}) => {
		logger.info("🧹 Material processing task cleanup complete", {
			materialId: payload.materialId,
		});
		// TODO: Clean up temporary files if any
	},
	onFailure: async ({
		payload,
		error,
	}: {
		payload: ProcessAndEmbedIndividualPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("❌ Material processing failed permanently", {
			materialId: payload.materialId,
			filePath: payload.filePath,
			contentType: payload.contentType,
			error: errorMessage,
		});

		// Update final failure status in database
		await db
			.update(courseMaterials)
			.set({
				processingMetadata: {
					processingStatus: "failed",
					error: errorMessage,
					failedAt: new Date().toISOString(),
				},
				embeddingStatus: "failed",
				processingCompletedAt: new Date(),
			})
			.where(eq(courseMaterials.id, payload.materialId));

		// TODO: Send failure notification/webhook
		// TODO: Add to retry queue or alert admins
	},
	// @ts-expect-error - onCancel supported by SDK at runtime
	onCancel: async ({ payload }) => {
		// Clean up uploaded file if processing cancelled
		await removeCourseMaterial(payload.filePath);
		logger.info("🗑️ Cleanup after cancel", { materialId: payload.materialId });
	},
});
