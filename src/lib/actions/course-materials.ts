"use server";

import { db } from "@/db";
import { courseMaterials, courseWeeks, courses } from "@/db/schema";
import { deleteContentForCourseWeek } from "@/lib/services/content-deletion-service";
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
			// Ensure material is defined and has required fields
			if (!material?.weekId) {
				throw new Error("Material weekId is required for deletion");
			}

			const aiContentResult = await deleteContentForCourseWeek(
				tx,
				material.courseId,
				material.weekId,
				[materialId]
			);

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
				ownNotesDeleted: aiContentResult.ownNotesDeleted,
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
			ownNotesDeleted: deletionResult.ownNotesDeleted || 0,
			filesDeleted: storageResult.filesDeleted,
			storageErrors: storageResult.hasErrors ? storageResult.storageErrors : undefined,
			jobCancelled: jobCancellationResult?.success || false,
			jobCancellationDetails: jobCancellationResult || undefined,
		};
	} catch (error) {
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
