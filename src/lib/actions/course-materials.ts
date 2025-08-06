"use server";

import { db } from "@/db";
import { courseMaterials, courseWeeks, courses } from "@/db/schema";
import { deleteContentForCourseWeek } from "@/lib/services/content-deletion-service";
import {
	cleanupStorageFiles,
	extractFilePaths,
} from "@/lib/services/storage-cleanup-service";
import { getServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
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
		where: and(eq(courses.id, material.courseId), eq(courses.userId, user.id)),
		columns: { id: true, userId: true },
	});

	if (!course) {
		throw new Error("Course not found.");
	}

	if (course.userId !== user.id) {
		throw new Error(
			"You don't have permission to add materials to this course."
		);
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

	// Mark the week as having materials
	await db
		.update(courseWeeks)
		.set({ hasMaterials: true })
		.where(eq(courseWeeks.id, week.id));

	revalidatePath(`/dashboard/course-materials/${material.courseId}`);
}

export async function markMaterialsUploadFailed(materialIds: string[]) {
	try {
		const response = await fetch("/api/materials/upload-failed", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				materialIds,
			}),
		});

		if (!response.ok) {
			const errorData = await response
				.json()
				.catch(() => ({ error: "Failed to mark uploads as failed" }));
			throw new Error(errorData.error || "Failed to mark uploads as failed");
		}

		const result = await response.json();
		return result;
	} catch (error) {
		logger.error("Failed to mark materials upload as failed", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			action: "markMaterialsUploadFailed",
			materialIds,
		});
		throw error;
	}
}

export async function deleteCourseMaterial(
	materialId: string,
	filePath?: string | null
) {
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
		// Step 1: Fetch material with ownership verification
		material = await db.query.courseMaterials.findFirst({
			where: eq(courseMaterials.id, materialId),
			with: {
				course: true,
			},
		});

		if (!material) {
			throw new Error(
				"Course material not found or you don't have permission to delete it."
			);
		}

		// Verify ownership through course relationship
		if (material.course.userId !== user.id) {
			throw new Error(
				"You don't have permission to delete this course material."
			);
		}

		// Step 2: Background job cancellation

		// Step 3: Execute deletion in transaction
		await db.transaction(async (tx) => {
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

			// Check if this was the last material for the week
			const remainingMaterials = await tx
				.select({ id: courseMaterials.id })
				.from(courseMaterials)
				.where(eq(courseMaterials.weekId, material.weekId))
				.limit(1);

			// If no materials remain, mark the week as not having materials
			if (remainingMaterials.length === 0) {
				await tx
					.update(courseWeeks)
					.set({ hasMaterials: false })
					.where(eq(courseWeeks.id, material.weekId));
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
		const allFilePaths = extractFilePaths(
			[material],
			filePath ? [filePath] : []
		);
		await cleanupStorageFiles(allFilePaths);

		// Step 5: Revalidate related pages
		revalidatePath("/dashboard/course-materials");
		revalidatePath(`/dashboard/course-materials/${material.courseId}`);

		return {
			success: true,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";

		logger.error("Failed to delete course material", {
			message: errorMessage,
			stack: error instanceof Error ? error.stack : undefined,
			action: "deleteCourseMaterial",
			materialId,
			userId: user.id,
			materialExists: !!material,
		});

		// Re-throw with user-friendly message
		if (error instanceof Error) {
			throw error;
		}

		throw new Error(`Failed to delete course material: ${errorMessage}`);
	}
}
