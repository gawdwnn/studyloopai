/**
 * Batch Content Generation Actions
 * Efficient batch processing using Trigger.dev batchTrigger API
 *
 * @deprecated This function is largely superseded by the new frontend-first upload flow:
 * - Frontend uploads files directly to Supabase storage via presigned URLs
 * - /api/materials/presign handles file validation and database record creation
 * - /api/materials/complete initiates background processing
 *
 * This function is kept for:
 * - Legacy compatibility
 * - Admin/bulk operations
 * - API-based uploads
 * - Scenarios requiring comprehensive server-side file handling
 */

"use server";

import type { MaterialUploadData } from "@/components/course/course-material-upload-wizard";
import { db } from "@/db";
import { type ProcessingMetadata, courseMaterials } from "@/db/schema";
import {
	CONTENT_TYPES,
	FILE_UPLOAD_LIMITS,
	getContentTypeFromFilename,
	getContentTypeFromMime,
} from "@/lib/constants/file-upload";
import { getServerClient } from "@/lib/supabase/server";
import { uploadCourseMaterial } from "@/lib/supabase/storage";
import { tasks } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";

interface BatchUploadResult {
	success: boolean;
	batchId?: string;
	successCount?: number;
	error?: string;
	failedMaterials?: Array<{
		fileName: string;
		error: string;
	}>;
}

/**
 * Process multiple materials in a single efficient batch operation
 *
 * @deprecated This function is largely superseded by the new frontend-first upload flow.
 * The new flow provides better UX with immediate feedback and uses presigned URLs for direct uploads.
 *
 * However, this function contains valuable validation logic that should be preserved
 * for specific use cases like admin operations or API-based uploads.
 */
export async function uploadAndProcessMaterialsBatch(
	materials: MaterialUploadData[]
): Promise<BatchUploadResult> {
	if (!materials || materials.length === 0) {
		return { success: false, error: "No materials provided" };
	}

	if (materials.length > 50) {
		return {
			success: false,
			error: "Maximum 50 materials allowed per batch. Please split into smaller batches.",
		};
	}

	try {
		// Validate file sizes and types upfront
		const validationErrors: Array<{ fileName: string; error: string }> = [];

		for (const material of materials) {
			const file = material.file;

			// Check file size
			if (file.size > FILE_UPLOAD_LIMITS.MAX_FILE_SIZE) {
				validationErrors.push({
					fileName: file.name,
					error: `File too large. Max size is ${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
				});
			}

			// Check file type (v1: PDF only)
			if (!Object.keys(FILE_UPLOAD_LIMITS.ACCEPTED_FILE_TYPES).includes(file.type)) {
				validationErrors.push({
					fileName: file.name,
					error: "Only PDF files are currently supported",
				});
			}
		}

		if (validationErrors.length > 0) {
			return {
				success: false,
				error: `Validation failed for ${validationErrors.length} files`,
				failedMaterials: validationErrors,
			};
		}

		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "Authentication required" };
		}

		// Phase 1: Create all material records and upload files
		const materialCreationResults: Array<{
			materialId: string;
			filePath: string;
			fileName: string;
			success: boolean;
			error?: string;
		}> = [];

		for (const materialData of materials) {
			try {
				// Detect content type
				const contentType =
					materialData.contentType ||
					getContentTypeFromMime(materialData.file.type) ||
					getContentTypeFromFilename(materialData.file.name);

				// Create material record
				const [material] = await db
					.insert(courseMaterials)
					.values({
						courseId: materialData.courseId,
						weekId: materialData.weekId,
						title: materialData.file.name,
						fileName: materialData.file.name,
						originalFilename: materialData.file.name,
						fileSize: materialData.file.size,
						mimeType: materialData.file.type,
						contentType,
						uploadStatus: "pending",
						processingMetadata: {
							processingStatus: "pending",
						},
						processingStartedAt: new Date(),
						uploadedBy: user.id,
					})
					.returning();

				// Save user generation config
				if (materialData.generationConfig) {
					const { saveMaterialGenerationConfig } = await import(
						"@/lib/services/generation-config-service"
					);
					await saveMaterialGenerationConfig(material.id, user.id, materialData.generationConfig);
				}

				// Upload file to storage
				const uploadResult = await uploadCourseMaterial(
					user.id,
					material.id,
					materialData.file.name,
					materialData.file
				);

				if (!uploadResult.success) {
					materialCreationResults.push({
						materialId: material.id,
						filePath: "",
						fileName: materialData.file.name,
						success: false,
						error: uploadResult.error || "Failed to upload file",
					});
					continue;
				}

				const filePath =
					uploadResult.filePath || `${user.id}/${material.id}/${materialData.file.name}`;

				// Update material with upload completion
				await db
					.update(courseMaterials)
					.set({
						filePath,
						uploadStatus: "completed",
					})
					.where(eq(courseMaterials.id, material.id));

				materialCreationResults.push({
					materialId: material.id,
					filePath,
					fileName: materialData.file.name,
					success: true,
				});
			} catch (error) {
				materialCreationResults.push({
					materialId: "",
					filePath: "",
					fileName: materialData.file.name,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		// Filter successful materials for batch processing
		const successfulMaterials = materialCreationResults.filter((result) => result.success);
		const failedMaterials = materialCreationResults
			.filter((result) => !result.success)
			.map((result) => ({
				fileName: result.fileName,
				error: result.error || "Unknown error",
			}));

		if (successfulMaterials.length === 0) {
			return {
				success: false,
				error: "All materials failed to upload",
				failedMaterials,
			};
		}

		// Phase 2: Trigger orchestrator task to handle embedding & AI generation
		const ingestHandle = await tasks.trigger("ingest-course-materials", {
			userId: user.id,
			materials: successfulMaterials.map((material) => ({
				materialId: material.materialId,
				filePath: material.filePath,
				contentType: CONTENT_TYPES.PDF, // TODO: derive real type
			})),
		});

		// Optionally link each material to the orchestrator run for observability
		for (const material of successfulMaterials) {
			await db
				.update(courseMaterials)
				.set({
					runId: ingestHandle.id,
					processingMetadata: {
						processingStatus: "processing",
						batchId: ingestHandle.id,
					},
				})
				.where(eq(courseMaterials.id, material.materialId));
		}

		return {
			success: true,
			batchId: ingestHandle.id, // Rename meaningfully on caller
			successCount: successfulMaterials.length,
			failedMaterials: failedMaterials.length > 0 ? failedMaterials : undefined,
		};
	} catch (error) {
		console.error("Batch upload and processing failed:", error);
		const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Get batch processing status
 */
export async function getBatchProcessingStatus(batchId: string): Promise<{
	success: boolean;
	status?: string;
	completedCount?: number;
	totalCount?: number;
	error?: string;
}> {
	try {
		// Query materials with this batch ID
		const materials = await db.query.courseMaterials.findMany({
			where: eq(courseMaterials.runId, batchId),
			columns: {
				id: true,
				processingMetadata: true,
				embeddingStatus: true,
			},
		});

		if (materials.length === 0) {
			return { success: false, error: "Batch not found" };
		}

		const totalCount = materials.length;
		const completedCount = materials.filter((m) => {
			const metadata = m.processingMetadata as ProcessingMetadata;
			return metadata?.processingStatus === "completed" || m.embeddingStatus === "completed";
		}).length;

		const allCompleted = completedCount === totalCount;
		const hasFailures = materials.some((m) => {
			const metadata = m.processingMetadata as ProcessingMetadata;
			return metadata?.processingStatus === "failed" || m.embeddingStatus === "failed";
		});

		let status = "processing";
		if (allCompleted) {
			status = "completed";
		} else if (hasFailures) {
			status = "partial_failure";
		}

		return {
			success: true,
			status,
			completedCount,
			totalCount,
		};
	} catch (error) {
		console.error("Failed to get batch status:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to get batch status",
		};
	}
}
