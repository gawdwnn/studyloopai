import { generateEmbeddings } from "@/lib/ai/embeddings";
import { CONTENT_TYPES } from "@/lib/config/file-upload";
import { PDF_PROCESSING_LIMITS } from "@/lib/config/pdf-processing";
import { parsePDF } from "@/lib/processing/pdf-parser";
import {
	insertDocumentChunks,
	updateCourseMaterialStatus,
} from "@/lib/services/background-job-db-service";
import { downloadCourseMaterial } from "@/lib/supabase/storage";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
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
		maxAttempts: 1,
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

		await updateCourseMaterialStatus(payload.materialId, "processing", {
			processingStartedAt: new Date(),
		});
	},
	run: async (payload: ProcessAndEmbedIndividualPayloadType) => {
		const { materialId, filePath, contentType } = payload;

		// Tag this run for enhanced observability
		await tags.add([`materialId:${payload.materialId}`, "phase:embedding"]);

		try {
			// 1. Download and parse single file
			const downloadResult = await downloadCourseMaterial(filePath);

			if (!downloadResult.success) {
				logger.error("❌ Download failed", {
					materialId,
					filePath,
					error: downloadResult.error,
					step: "download",
				});
				throw new Error(
					downloadResult.error || `Failed to download ${filePath}`
				);
			}

			if (!downloadResult.buffer) {
				logger.error("❌ No buffer data received", {
					materialId,
					filePath,
					step: "download",
				});
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
					logger.error("❌ PDF text extraction failed", {
						materialId,
						filePath,
						error: pdfResult.error,
						step: "text_extraction",
					});
					throw new Error(
						`Failed to extract text from PDF: ${filePath}. Error: ${pdfResult.error}`
					);
				}
			} else {
				logger.error("❌ Unsupported content type", {
					materialId,
					filePath,
					contentType,
					supportedTypes: [CONTENT_TYPES.PDF],
					step: "text_extraction",
				});
				// Future: Handle other content types (video, audio, image, weblink)
				throw new Error(
					`Content type '${contentType}' is not yet supported. Currently only PDF processing is implemented.`
				);
			}

			if (!extractedText.trim()) {
				logger.error("❌ No extractable text found", {
					materialId,
					filePath,
					textLength: extractedText.length,
					step: "text_extraction",
				});
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
				logger.error("❌ Embedding generation failed", {
					materialId,
					chunksCount: chunks.length,
					error: result.error,
					step: "embedding",
				});
				throw new Error(`Embedding generation failed: ${result.error}`);
			}

			// 5. Save chunks to database
			const chunksToInsert = result.embeddings.map(
				(embedding: number[], i: number) => ({
					material_id: materialId,
					content: chunks[i].pageContent,
					embedding: embedding,
					chunk_index: i,
					token_count: Math.round(chunks[i].pageContent.length / 4),
				})
			);

			// Using admin database client to bypass RLS policies for background processing
			await insertDocumentChunks(chunksToInsert);

			// 6. Update final status to 'completed'
			await updateCourseMaterialStatus(materialId, "completed", {
				processingCompletedAt: new Date(),
			});

			logger.info("✅ Material processing pipeline completed successfully", {
				materialId,
				filePath,
				contentType,
			});

			return {
				success: true,
				materialId,
				contentType,
			};
		} catch (error) {
			// log error as it

			logger.error("❌ Material processing failed", {});

			await updateCourseMaterialStatus(payload.materialId, "failed", {
				processingCompletedAt: new Date(),
			});

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
	}: {
		payload: ProcessAndEmbedIndividualPayloadType;
	}) => {
		//log error as is

		logger.error("❌ Material processing failed permanently", {
			materialId: payload.materialId,
			filePath: payload.filePath,
			contentType: payload.contentType,
		});

		await updateCourseMaterialStatus(payload.materialId, "failed", {
			processingCompletedAt: new Date(),
		});
	},
});
