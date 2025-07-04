"use server";

import { db } from "@/db";
import { courseMaterials, courseWeeks, courses } from "@/db/schema";
import { deleteAiContentForMaterial } from "@/lib/services/ai-content-deletion-service";
import { cancelSingleJob } from "@/lib/services/job-cancellation-service";
import { cleanupStorageFiles, extractFilePaths } from "@/lib/services/storage-cleanup-service";
import { getServerClient } from "@/lib/supabase/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addCourseMaterial(material: {
	courseId: string;
	weekNumber: number;
	title: string;
	filePath: string;
	fileSize: number;
	mimeType: string;
}) {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("You must be logged in to add course materials.");
	}

	const course = await db.query.courses.findFirst({
		where: eq(courses.id, material.courseId),
		columns: { id: true, userId: true },
	});

	if (!course) {
		throw new Error("Course not found.");
	}

	if (course.userId !== user.id) {
		throw new Error("You don't have permission to add materials to this course.");
	}

	// Get the week ID from the week number and course ID (now safe since ownership verified)
	const week = await db.query.courseWeeks.findFirst({
		where: and(
			eq(courseWeeks.courseId, material.courseId),
			eq(courseWeeks.weekNumber, material.weekNumber)
		),
	});

	if (!week) {
		throw new Error("The selected week does not exist for this course.");
	}

	await db.insert(courseMaterials).values({
		courseId: material.courseId,
		weekId: week.id,
		title: material.title,
		filePath: material.filePath,
		fileSize: material.fileSize,
		mimeType: material.mimeType,
		uploadedBy: user.id,
		uploadStatus: "completed",
	});

	revalidatePath(`/dashboard/course-materials/${material.courseId}`);
}

export async function deleteCourseMaterial(materialId: string, filePath?: string | null) {
	const supabase = await getServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("You must be logged in to delete course materials.");
	}

	// Validate materialId format
	if (!materialId || typeof materialId !== "string" || materialId.trim() === "") {
		throw new Error("Invalid material ID provided.");
	}

	let material:
		| (typeof courseMaterials.$inferSelect & {
				course: typeof courses.$inferSelect;
		  })
		| undefined;

	try {
		// Step 1: Fetch material with ownership verification and get all related data
		material = await db.query.courseMaterials.findFirst({
			where: eq(courseMaterials.id, materialId),
			with: {
				course: true,
			},
		});

		if (!material) {
			throw new Error("Course material not found or you don't have permission to delete it.");
		}

		// Verify ownership through course relationship
		if (material.course.userId !== user.id) {
			throw new Error("You don't have permission to delete this course material.");
		}

		// Step 2: Cancel running background job if exists
		let jobCancellationResult = null;
		if (material.runId) {
			jobCancellationResult = await cancelSingleJob(material.runId);
		}

		// Step 3: Execute deletion in transaction
		const deletionResult = await db.transaction(async (tx) => {
			// Delete AI content and get counts
			const aiContentResult = await deleteAiContentForMaterial(tx, materialId);

			// Delete the main course material record
			const [deletedMaterial] = await tx
				.delete(courseMaterials)
				.where(eq(courseMaterials.id, materialId))
				.returning({
					courseId: courseMaterials.courseId,
					title: courseMaterials.title,
					fileSize: courseMaterials.fileSize,
				});

			if (!deletedMaterial) {
				throw new Error("Failed to delete course material from database.");
			}

			return {
				...deletedMaterial,
				configsDeleted: aiContentResult.configsDeleted,
				aiContentDeleted: aiContentResult.aiContentDeleted,
				chunksDeleted: aiContentResult.chunksDeleted,
			};
		});

		// Step 4: Clean up storage files (after successful DB deletion)
		const allFilePaths = extractFilePaths([material], filePath ? [filePath] : []);
		const storageResult = await cleanupStorageFiles(allFilePaths);

		// Step 5: Revalidate related pages
		revalidatePath("/dashboard/course-materials");
		revalidatePath(`/dashboard/course-materials/${deletionResult.courseId}`);
		// Return summary of deletion
		return {
			success: true,
			materialId,
			courseId: deletionResult.courseId,
			chunksDeleted: deletionResult.chunksDeleted,
			configsDeleted: deletionResult.configsDeleted,
			aiContentDeleted: deletionResult.aiContentDeleted,
			filesDeleted: storageResult.filesDeleted,
			storageErrors: storageResult.hasErrors ? storageResult.storageErrors : undefined,
			jobCancelled: jobCancellationResult?.success || false,
			jobCancellationDetails: jobCancellationResult || undefined,
		};
	} catch (error) {
		// Comprehensive error logging
		const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

		console.error(`Failed to delete course material ${materialId}:`, {
			error: errorMessage,
			materialId,
			userId: user.id,
			materialExists: !!material,
			runId: material?.runId,
		});

		// Re-throw with user-friendly message
		if (error instanceof Error) {
			throw error;
		}

		throw new Error(`Failed to delete course material: ${errorMessage}`);
	}
}

/**
 * Utility function to clean up orphaned files in storage
 * This can be used for maintenance or recovery scenarios
 */
export async function cleanupOrphanedFiles(courseId: string) {
	const supabase = await getServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("You must be logged in to perform cleanup operations.");
	}

	try {
		// First verify user owns the course (RLS compliance)
		const course = await db.query.courses.findFirst({
			where: eq(courses.id, courseId),
			columns: { id: true, userId: true },
		});

		if (!course) {
			throw new Error("Course not found.");
		}

		if (course.userId !== user.id) {
			throw new Error("You don't have permission to cleanup files for this course.");
		}

		// Get all files in storage for this user (using regular client)
		const { data: storageFiles, error: listError } = await supabase.storage
			.from("course-materials")
			.list(user.id, { limit: 1000 });

		if (listError) {
			throw new Error(`Failed to list storage files: ${listError.message}`);
		}

		if (!storageFiles || storageFiles.length === 0) {
			return { orphanedFiles: 0, cleanedUp: 0 };
		}

		// Get all file paths from database for this course (RLS will automatically filter by ownership)
		const dbMaterials = await db.query.courseMaterials.findMany({
			where: eq(courseMaterials.courseId, courseId),
			columns: { filePath: true },
		});

		const dbFilePaths = new Set(dbMaterials.map((m) => m.filePath).filter(Boolean));

		// Find orphaned files
		const orphanedFiles: string[] = [];

		for (const file of storageFiles) {
			const fullPath = `${user.id}/${file.name}`;
			if (!dbFilePaths.has(fullPath)) {
				orphanedFiles.push(fullPath);
			}
		}

		// Clean up orphaned files (using regular client to respect RLS)
		let cleanedCount = 0;
		if (orphanedFiles.length > 0) {
			const { error: removeError } = await supabase.storage
				.from("course-materials")
				.remove(orphanedFiles);

			if (!removeError) {
				cleanedCount = orphanedFiles.length;
			}
		}

		return {
			orphanedFiles: orphanedFiles.length,
			cleanedUp: cleanedCount,
			files: orphanedFiles,
		};
	} catch (error) {
		console.error(`Failed to cleanup orphaned files for course ${courseId}:`, error);
		throw error;
	}
}

/**
 * Enhanced deletion with pre-flight checks and batch operations
 */
export async function deleteMultipleCourseMaterials(materialIds: string[]) {
	if (!materialIds || materialIds.length === 0) {
		throw new Error("No material IDs provided for deletion.");
	}

	if (materialIds.length > 50) {
		throw new Error("Cannot delete more than 50 materials at once. Please batch your requests.");
	}

	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("You must be logged in to delete course materials.");
	}

	const results: Array<{
		materialId: string;
		success: boolean;
		error?: string;
	}> = [];

	// Process deletions sequentially to avoid overwhelming the system
	for (const materialId of materialIds) {
		try {
			await deleteCourseMaterial(materialId);
			results.push({ materialId, success: true });
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			results.push({ materialId, success: false, error: errorMessage });
		}
	}

	const successCount = results.filter((r) => r.success).length;
	const failureCount = results.filter((r) => !r.success).length;

	return {
		total: materialIds.length,
		successful: successCount,
		failed: failureCount,
		results,
	};
}
