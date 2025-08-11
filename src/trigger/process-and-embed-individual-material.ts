import { generateEmbeddings } from "@/lib/ai/embeddings";
import { contentGenerationEvents } from "@/lib/analytics/events";
import {
	getDocumentProcessor,
	isSupportedDocumentType,
} from "@/lib/processing";
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
	userId: z.string().min(1, "User ID is required"),
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
		const { materialId, filePath, contentType, userId } = payload;

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

			// 2. Check if the document type is supported
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

			// 3. Process document directly for easier traceability
			const processor = await getDocumentProcessor(contentType);
			const processingResult = await processor.process(buffer, {
				materialId,
			});

			if (!processingResult.success || !processingResult.text.trim()) {
				logger.error("Document processing failed", {
					materialId,
					filePath,
					contentType,
					error: processingResult.error,
					source: processingResult.metadata.source,
					processor: processingResult.metadata.processor,
					step: "text_extraction",
				});
				throw new Error(
					`Failed to extract text from document: ${filePath}. Error: ${processingResult.error || "No extractable text found"}`
				);
			}

			const extractedText = processingResult.text;
			logger.info("Document processing completed", {
				materialId,
				filePath,
				contentType,
				textLength: extractedText.length,
				source: processingResult.metadata.source,
				processor: processingResult.metadata.processor,
				confidence: processingResult.metadata.confidence,
				warnings: processingResult.metadata.warnings,
			});

			// 4. Chunk text
			const splitter = new RecursiveCharacterTextSplitter({
				chunkSize: 1000,
				chunkOverlap: 200,
			});
			const chunks = await splitter.createDocuments([extractedText]);

			// 5. Generate embeddings
			const result = await generateEmbeddings(
				chunks.map((c: Document) => c.pageContent)
			);

			if (!result.success) {
				logger.error("Embedding generation failed", {
					materialId,
					chunksCount: chunks.length,
					error: result.error,
					step: "embedding",
				});
				throw new Error(`Embedding generation failed: ${result.error}`);
			}

			// 6. Save chunks to database (idempotent)
			const chunksToInsert = result.embeddings.map(
				(embedding: number[], i: number) => ({
					material_id: materialId,
					content: chunks[i].pageContent,
					embedding: embedding,
					chunk_index: i,
					token_count: Math.round(chunks[i].pageContent.length / 4),
				})
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

			await insertDocumentChunks(chunksToInsert);

			// 7. Track embedding generation for analytics and billing
			try {
				const totalTokens = chunksToInsert.reduce(
					(sum, chunk) => sum + chunk.token_count,
					0
				);
				await contentGenerationEvents.vectorEmbedding(
					{
						materialId,
						chunkCount: chunks.length,
						processingTime: 0, // Processing time not tracked in this context
						embeddingModel: "text-embedding-3-small",
						embeddingProvider: "openai",
						totalTokens,
						courseId: undefined, // Could be retrieved if needed
						success: true,
					},
					userId
				);
			} catch (trackingError) {
				// Don't fail the job if tracking fails
				logger.error("Failed to track embedding generation", {
					error:
						trackingError instanceof Error
							? trackingError.message
							: String(trackingError),
					materialId,
				});
			}

			// 9. Update final status to 'completed'
			await updateCourseMaterialStatus(materialId, "completed", {
				processingCompletedAt: new Date(),
			});

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
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: ProcessAndEmbedIndividualPayloadType;
		output: z.infer<typeof ProcessAndEmbedIndividualOutput>;
	}) => {
		logger.info("Material processing completed successfully", {
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
		logger.error("Material processing failed permanently", {
			materialId: payload.materialId,
			filePath: payload.filePath,
			contentType: payload.contentType,
		});

		await updateCourseMaterialStatus(payload.materialId, "failed", {
			processingCompletedAt: new Date(),
		});
	},
});
