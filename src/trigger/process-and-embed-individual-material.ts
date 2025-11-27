import { generateEmbeddings } from "@/lib/ai/embeddings";
import { generateChunks } from "@/lib/ai/generate-chunks";
import { isSupportedDocumentType } from "@/lib/config/document-processing";
import { getDocumentProcessor } from "@/lib/document-processor/processor-factory";
import {
	insertDocumentChunks,
	updateCourseMaterialStatus,
} from "@/lib/services/background-job-db-service";
import { downloadCourseMaterial } from "@/lib/supabase/storage";
import { logger, schemaTask, tags } from "@trigger.dev/sdk";
import { z } from "zod";

const ProcessAndEmbedIndividualPayload = z.object({
	materialId: z.string().min(1, "Material ID is required"),
	filePath: z.string().min(1, "File path is required"),
	contentType: z.string().min(1, "Content type is required"),
	userId: z.string().min(1, "User ID is required"),
});

type ProcessAndEmbedIndividualPayloadType = z.infer<
	typeof ProcessAndEmbedIndividualPayload
>;

export const processAndEmbedIndividualMaterial = schemaTask({
	id: "process-and-embed-individual-material",
	schema: ProcessAndEmbedIndividualPayload,
	maxDuration: 900, // Allow up to 15 minutes for processing & embedding very large materials
	retry: {
		maxAttempts: 2, // Limited retries for document processing
		factor: 2,
		minTimeoutInMs: 2000, // Longer initial delay for file operations
		maxTimeoutInMs: 30000, // Match config default for AI embedding calls
		randomize: true,
	},
	onStart: async ({
		payload,
	}: {
		payload: ProcessAndEmbedIndividualPayloadType;
	}) => {
		logger.info("Material processing task started", {
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
				logger.error("Download failed", {
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
				logger.error("No buffer data received", {
					materialId,
					filePath,
					step: "download",
				});
				throw new Error(`No data received for file: ${filePath}`);
			}

			const buffer = downloadResult.buffer;

			// 2. Check if the document type is supported (contentType is actually MIME type)
			if (!isSupportedDocumentType(contentType)) {
				logger.error("Unsupported document type", {
					materialId,
					filePath,
					contentType,
					step: "document_validation",
				});
				throw new Error(
					`Document type '${contentType}' is not supported. Supported: PDF, Office (Word/Excel/PowerPoint), and Text (TXT/CSV/MD).`
				);
			}

			// 3. Process document directly for easier traceability (contentType is actually MIME type)
			const processor = await getDocumentProcessor(contentType);
			const processingResult = await processor.process(buffer);

			if (!processingResult.success || !processingResult.text?.trim()) {
				logger.error("Document processing failed", {
					materialId,
					filePath,
					contentType,
					error: processingResult.error,
					source: processingResult.source,
					step: "document_processing",
				});
				throw new Error(
					`Failed to extract text from document: ${filePath}. Error: ${processingResult.error || "No extractable text found"}`
				);
			}

			const extractedText = processingResult.text;

			// 4. Chunk text using AI SDK native approach - guaranteed string output
			const textChunks = generateChunks(extractedText);

			if (!textChunks || textChunks.length === 0) {
				logger.error("Text chunking failed - no valid chunks generated", {
					materialId,
					filePath,
					step: "text_chunking",
				});
				throw new Error(
					`Failed to generate text chunks from document: ${filePath}`
				);
			}

			// 5. Generate embeddings
			const result = await generateEmbeddings(textChunks);

			if (!result.success) {
				logger.error("Embedding generation failed", {
					materialId,
					chunksCount: textChunks.length,
					error: result.error,
					step: "embedding",
				});
				throw new Error(`Embedding generation failed: ${result.error}`);
			}

			// 6. Save chunks to database (idempotent) - now with guaranteed string content
			const chunksToInsert = result.embeddings.map(
				(embedding: number[], i: number) => {
					const content = textChunks[i];

					return {
						material_id: materialId,
						content: String(content), // Explicit string conversion as final safety
						embedding: embedding,
						chunk_index: i,
						token_count: Math.round(String(content).length / 4),
					};
				}
			);

			// Idempotent write: remove existing chunks for this material before insert
			// to avoid duplicates on retries.
			try {
				const { getAdminDatabaseAccess } = await import("@/db");
				const admin = getAdminDatabaseAccess();
				await admin
					.from("document_chunks")
					.delete()
					.eq("material_id", materialId);
			} catch (cleanupError) {
				logger.error("Failed to cleanup existing chunks before insert", {
					materialId,
					error:
						cleanupError instanceof Error
							? cleanupError.message
							: String(cleanupError),
				});
				// Continue; insert will still proceed
			}

			try {
				await insertDocumentChunks(chunksToInsert);
			} catch (insertError) {
				logger.error("Failed to insert document chunks", {
					materialId,
					error:
						insertError instanceof Error
							? insertError.message
							: String(insertError),
					step: "database_insert",
				});
				throw insertError;
			}

			// 9. Update final status to 'completed'
			try {
				await updateCourseMaterialStatus(materialId, "completed", {
					processingCompletedAt: new Date(),
				});
			} catch (statusError) {
				logger.error("Failed to update material status to completed", {
					materialId,
					error:
						statusError instanceof Error
							? statusError.message
							: String(statusError),
					step: "status_update",
				});
				throw statusError;
			}

			logger.info("Material processing pipeline completed successfully", {
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
			logger.error("Material processing failed", {
				materialId: payload.materialId,
				filePath: payload.filePath,
				contentType: payload.contentType,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});

			await updateCourseMaterialStatus(payload.materialId, "failed", {
				processingCompletedAt: new Date(),
			});

			throw error;
		}
	},
	onFailure: async ({
		payload,
	}: {
		payload: ProcessAndEmbedIndividualPayloadType;
	}) => {
		await updateCourseMaterialStatus(payload.materialId, "failed", {
			processingCompletedAt: new Date(),
		});
	},
});
