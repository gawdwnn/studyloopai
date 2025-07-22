import { getAdminDatabaseAccess } from "@/db";
import { courseMaterials, documentChunks } from "@/db/schema";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import { CONTENT_TYPES } from "@/lib/config/file-upload";
import { PDF_PROCESSING_LIMITS } from "@/lib/config/pdf-processing";
import { parsePDF } from "@/lib/processing/pdf-parser";
import { downloadCourseMaterial } from "@/lib/supabase/storage";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
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
});

type ProcessAndEmbedIndividualPayloadType = z.infer<
	typeof ProcessAndEmbedIndividualPayload
>;

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
		const adminDb = getAdminDatabaseAccess();
		await adminDb
			.update(courseMaterials)
			.set({
				embeddingStatus: "processing",
				processingStartedAt: new Date(),
			})
			.where(eq(courseMaterials.id, payload.materialId));
	},
	run: async (payload: ProcessAndEmbedIndividualPayloadType) => {
		const { materialId, filePath, contentType } = payload;

		// Tag this run for enhanced observability
		await tags.add([`materialId:${payload.materialId}`, "phase:embedding"]);

		try {
			// Status already updated to 'processing' in onStart

			// 1. Download and parse single file
			const downloadResult = await downloadCourseMaterial(filePath);

			if (!downloadResult.success) {
				throw new Error(
					downloadResult.error || `Failed to download ${filePath}`
				);
			}

			if (!downloadResult.buffer) {
				throw new Error(`No data received for file: ${filePath}`);
			}

			const buffer = downloadResult.buffer;

			let extractedText = "";

			// 2. Process based on content type (v1: PDF only)
			if (contentType === CONTENT_TYPES.PDF) {
				const pdfResult = await parsePDF(buffer, {
					cleanText: true,
					timeout: PDF_PROCESSING_LIMITS.MAX_PROCESSING_TIMEOUT,
				});

				if (pdfResult.success && pdfResult.text && pdfResult.text.trim()) {
					extractedText = pdfResult.text;
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

			// 3. Chunk text
			const splitter = new RecursiveCharacterTextSplitter({
				chunkSize: PDF_PROCESSING_LIMITS.CHUNK_SIZE,
				chunkOverlap: PDF_PROCESSING_LIMITS.CHUNK_OVERLAP,
			});
			const chunks = await splitter.createDocuments([extractedText]);

			// 4. Generate embeddings
			const result = await generateEmbeddings(
				chunks.map((c: Document) => c.pageContent)
			);
			if (!result.success) {
				throw new Error(`Embedding generation failed: ${result.error}`);
			}

			// 5. Save chunks to database
			const chunksToInsert = result.embeddings.map(
				(embedding: number[], i: number) => ({
					materialId: materialId,
					content: chunks[i].pageContent,
					embedding: embedding,
					chunkIndex: i,
					tokenCount: Math.round(chunks[i].pageContent.length / 4),
				})
			);
			// Using admin database client to bypass RLS policies for background processing
			const adminDb = getAdminDatabaseAccess();
			await adminDb.insert(documentChunks).values(chunksToInsert);

			// 6. Update final status to 'completed'
			const completedAt = new Date();

			await adminDb
				.update(courseMaterials)
				.set({
					embeddingStatus: "completed",
					totalChunks: chunks.length,
					embeddedChunks: chunks.length,
					processingCompletedAt: completedAt,
				})
				.where(eq(courseMaterials.id, materialId));

			return {
				success: true,
				materialId,
				chunksCreated: chunks.length,
				textLength: extractedText.length,
				contentType,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred";

			logger.error("❌ Material processing failed", {
				materialId,
				filePath,
				contentType,
				error: errorMessage,
			});

			// Update failure status using admin database access for background job
			const adminDb = getAdminDatabaseAccess();
			await adminDb
				.update(courseMaterials)
				.set({
					embeddingStatus: "failed",
					processingCompletedAt: new Date(),
				})
				.where(eq(courseMaterials.id, materialId));

			throw error;
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
			success: output.success,
		});
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

		// Update final failure status in database using admin access for background job
		const adminDb = getAdminDatabaseAccess();
		await adminDb
			.update(courseMaterials)
			.set({
				embeddingStatus: "failed",
				processingCompletedAt: new Date(),
			})
			.where(eq(courseMaterials.id, payload.materialId));
	},
});
