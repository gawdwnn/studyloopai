import { db } from "@/db";
import { courseMaterials, documentChunks } from "@/db/schema";
import { CONTENT_TYPES } from "@/lib/constants/file-upload";
import { PDF_PROCESSING_LIMITS } from "@/lib/constants/pdf-processing";
import { generateEmbeddings } from "@/lib/embeddings/embedding-service";
import { parsePDF } from "@/lib/processing/pdf-parser";
import { downloadCourseMaterial } from "@/lib/supabase/storage";
import { logger, schemaTask, tasks } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import type { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { z } from "zod";

// Zod schemas for type safety and validation
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

const GenerateAiContentPayload = z.object({
	materialId: z.string().min(1, "Material ID is required"),
});

const GenerateAiContentOutput = z.object({
	success: z.boolean(),
	materialId: z.string(),
	error: z.string().optional(),
});

type ProcessAndEmbedIndividualPayloadType = z.infer<typeof ProcessAndEmbedIndividualPayload>;
type GenerateAiContentPayloadType = z.infer<typeof GenerateAiContentPayload>;

// Task 2: Generate AI Content
export const generateAiContent = schemaTask({
	id: "generate-ai-content",
	schema: GenerateAiContentPayload,
	maxDuration: 300, // 5 minutes
	onStart: async ({ payload }: { payload: GenerateAiContentPayloadType }) => {
		await logger.info("🔄 AI Content Generation task started", {
			materialId: payload.materialId,
		});
	},
	init: async ({ payload }: { payload: GenerateAiContentPayloadType }) => {
		await logger.info("🚀 Initializing AI content generation", {
			materialId: payload.materialId,
		});
	},
	run: async (payload: GenerateAiContentPayloadType) => {
		const { materialId } = payload;
		await logger.info("🟢 [TASK 2] Starting AI content generation", {
			materialId,
		});

		try {
			// For now, this task is a placeholder.
			// In the future, it will fetch chunks and generate content.
			await logger.info("🧠 AI Content Generation logic will be implemented here.");
			await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work

			// Finally, update the overall status to 'completed'
			await db
				.update(courseMaterials)
				.set({
					processingMetadata: { processingStatus: "completed" },
				})
				.where(eq(courseMaterials.id, materialId));

			await logger.info("✅ [TASK 2] AI content generation complete", {
				materialId,
			});

			return { success: true, materialId };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
			await logger.error("❌ [TASK 2] AI content generation failed", {
				materialId,
				error: errorMessage,
			});
			await db
				.update(courseMaterials)
				.set({
					processingMetadata: { processingStatus: "failed" },
				})
				.where(eq(courseMaterials.id, materialId));
			return { success: false, materialId, error: errorMessage };
		}
	},
	cleanup: async ({ payload }: { payload: GenerateAiContentPayloadType }) => {
		await logger.info("🧹 Cleaning up AI content generation task", {
			materialId: payload.materialId,
		});
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: GenerateAiContentPayloadType;
		output: z.infer<typeof GenerateAiContentOutput>;
	}) => {
		await logger.info("✅ AI content generation completed successfully", {
			materialId: payload.materialId,
			success: output.success,
		});
		// TODO: Send success notification/webhook
	},
	onFailure: async ({
		payload,
		error,
	}: {
		payload: GenerateAiContentPayloadType;
		error: unknown;
	}) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		await logger.error("❌ AI content generation failed permanently", {
			materialId: payload.materialId,
			error: errorMessage,
		});
		// TODO: Send failure notification/webhook
	},
});

// Task 1: Process and Embed Individual Material
export const processAndEmbedIndividualMaterial = schemaTask({
	id: "process-and-embed-individual-material",
	schema: ProcessAndEmbedIndividualPayload,
	maxDuration: 600, // 10 minutes for processing large files
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
		await logger.info("📄 Material processing task started", {
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
	init: async ({
		payload,
	}: {
		payload: ProcessAndEmbedIndividualPayloadType;
	}) => {
		await logger.info("🔧 Initializing material processing", {
			materialId: payload.materialId,
		});
	},
	run: async (payload: ProcessAndEmbedIndividualPayloadType) => {
		const { materialId, filePath, contentType } = payload;
		await logger.info("🟢 [STANDALONE] Starting individual material processing", {
			materialId,
			filePath,
			contentType,
		});

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
			await logger.info(`📥 Downloading file: ${filePath}`);

			const downloadResult = await downloadCourseMaterial(filePath);

			if (!downloadResult.success) {
				await logger.error("Storage download error:", {
					filePath,
					error: downloadResult.error,
				});
				throw new Error(downloadResult.error || `Failed to download ${filePath}`);
			}

			if (!downloadResult.buffer) {
				throw new Error(`No data received for file: ${filePath}`);
			}

			const buffer = downloadResult.buffer;
			await logger.info(`File downloaded successfully: ${filePath}, size: ${buffer.length} bytes`);

			let extractedText = "";
			let contentMetadata = {};

			// 3. Process based on content type (v1: PDF only)
			if (contentType === CONTENT_TYPES.PDF) {
				const pdfResult = await parsePDF(buffer, {
					cleanText: true,
					timeout: PDF_PROCESSING_LIMITS.MAX_PROCESSING_TIMEOUT,
				});

				await logger.info(`PDF parsing result for ${filePath}:`, {
					success: pdfResult.success,
					hasText: !!pdfResult.text,
					textLength: pdfResult.text?.length || 0,
					error: pdfResult.error,
					metadata: pdfResult.metadata,
				});

				if (pdfResult.success && pdfResult.text && pdfResult.text.trim()) {
					extractedText = pdfResult.text;
					contentMetadata = {
						pageCount: pdfResult.metadata?.pageCount,
						processingTime: pdfResult.metadata?.processingTime,
						extractionMethod: pdfResult.metadata?.extractionMethod,
					};
					await logger.info(
						`PDF parsed successfully: ${filePath}, text length: ${extractedText.length}`
					);
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

			await logger.info(`📊 Text extracted: ${extractedText.length} characters`);

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
			await logger.info(`📝 Split content into ${chunks.length} chunks`);

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
			await logger.info("🧠 Generated embeddings for all chunks");

			// 8. Save chunks to database
			const chunksToInsert = result.embeddings.map((embedding: number[], i: number) => ({
				materialId: materialId,
				content: chunks[i].pageContent,
				embedding: embedding,
				chunkIndex: i,
				tokenCount: Math.round(chunks[i].pageContent.length / 4),
			}));
			await db.insert(documentChunks).values(chunksToInsert);
			await logger.info(`💾 Saved ${chunksToInsert.length} chunks to database`);

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

			await logger.info("✅ [STANDALONE] Individual material processing complete", {
				materialId,
				chunksCreated: chunks.length,
			});

			return {
				success: true,
				materialId,
				chunksCreated: chunks.length,
				textLength: extractedText.length,
				contentType: contentType,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
			await logger.error("❌ [STANDALONE] Individual material processing failed", {
				materialId,
				filePath,
				contentType,
				error: errorMessage,
			});

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

			return {
				success: false,
				materialId,
				error: errorMessage,
			};
		}
	},
	onSuccess: async ({
		payload,
		output,
	}: {
		payload: ProcessAndEmbedIndividualPayloadType;
		output: z.infer<typeof ProcessAndEmbedIndividualOutput>;
	}) => {
		await logger.info("✅ Material processing completed successfully", {
			materialId: payload.materialId,
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
		await logger.info("🧹 Cleaning up material processing task", {
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
		await logger.error("❌ Material processing failed permanently", {
			materialId: payload.materialId,
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
});
