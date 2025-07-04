"use server";

import { db } from "@/db";
import { courseMaterials, courseWeeks, courses } from "@/db/schema";
import { deleteAiContentForMaterials } from "@/lib/services/ai-content-deletion-service";
import { cancelMultipleJobs, extractRunIds } from "@/lib/services/job-cancellation-service";
import { cleanupStorageFiles, extractFilePaths } from "@/lib/services/storage-cleanup-service";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { type CourseCreationData, CourseCreationSchema } from "@/lib/validations/courses";
import { asc, count, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createCourse(formData: CourseCreationData) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("You must be logged in to create a course.");
		}

		const validatedData = CourseCreationSchema.parse(formData);

		const [newCourse] = await db
			.insert(courses)
			.values({
				...validatedData,
				userId: user.id,
			})
			.returning();

		// Create course weeks based on durationWeeks
		const weeks = Array.from({ length: newCourse.durationWeeks || 12 }, (_, i) => ({
			courseId: newCourse.id,
			weekNumber: i + 1,
			title: `Week ${i + 1}`,
		}));

		await db.insert(courseWeeks).values(weeks);

		revalidatePath("/dashboard");
		return newCourse;
	} catch (error) {
		console.error("Failed to create course:", error);

		// Re-throw for UI error handling, but with user-friendly message
		if (error instanceof Error && error.message.includes("logged in")) {
			throw error; // Auth errors should be thrown as-is
		}

		throw new Error("Failed to create course. Please try again.");
	}
}

export async function getUserCourses() {
	return await withErrorHandling(
		async () => {
			const userCourses = await db.query.courses.findMany({
				orderBy: desc(courses.createdAt),
			});
			return userCourses;
		},
		"getUserCourses",
		[] // fallback empty array
	);
}

export async function getCourseById(courseId: string) {
	return await withErrorHandling(
		async () => {
			const course = await db.query.courses.findFirst({
				where: eq(courses.id, courseId),
			});
			return course;
		},
		"getCourseById",
		null // fallback null
	);
}

export async function getAllUserMaterials() {
	return await withErrorHandling(
		async () => {
			const materials = await db.query.courseMaterials.findMany({
				with: {
					courseWeek: {
						columns: {
							weekNumber: true,
							contentGenerationMetadata: true,
						},
					},
					course: {
						columns: {
							name: true,
						},
					},
				},
				orderBy: desc(courseMaterials.createdAt),
			});
			return materials;
		},
		"getAllUserMaterials",
		[] // fallback empty array
	);
}

export async function getCourseWeeks(courseId: string) {
	return await withErrorHandling(
		async () => {
			const weeks = await db.query.courseWeeks.findMany({
				where: eq(courseWeeks.courseId, courseId),
				orderBy: asc(courseWeeks.weekNumber),
			});
			return weeks;
		},
		"getCourseWeeks",
		[] // fallback empty array
	);
}

export async function updateCourse(courseId: string, data: Partial<CourseCreationData>) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("You must be logged in to update a course.");
		}

		const validatedData = CourseCreationSchema.partial().parse(data);

		const [updatedCourse] = await db
			.update(courses)
			.set({
				...validatedData,
				updatedAt: new Date(),
			})
			.where(eq(courses.id, courseId))
			.returning();

		revalidatePath("/dashboard");
		return updatedCourse;
	} catch (error) {
		console.error("Failed to update course:", error);

		// Re-throw for UI error handling, but with user-friendly message
		if (error instanceof Error && error.message.includes("logged in")) {
			throw error; // Auth errors should be thrown as-is
		}

		throw new Error("Failed to update course. Please try again.");
	}
}

export async function deleteCourse(courseId: string) {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("You must be logged in to delete a course.");
	}

	// Validate courseId format
	if (!courseId || typeof courseId !== "string" || courseId.trim() === "") {
		throw new Error("Invalid course ID provided.");
	}

	let course: { id: string; name: string; userId: string } | undefined;
	let materialsData: Array<{
		id: string;
		filePath: string | null;
		runId: string | null;
	}> = [];

	try {
		// Step 1: Fetch course with ownership verification and get all related data
		course = await db.query.courses.findFirst({
			where: eq(courses.id, courseId),
			columns: { id: true, name: true, userId: true },
		});

		if (!course) {
			throw new Error("Course not found or you don't have permission to delete it.");
		}

		// Verify ownership
		if (course.userId !== user.id) {
			throw new Error("You don't have permission to delete this course.");
		}

		// Get all materials for this course with file paths and runIds
		materialsData = await db
			.select({
				id: courseMaterials.id,
				filePath: courseMaterials.filePath,
				runId: courseMaterials.runId,
			})
			.from(courseMaterials)
			.where(eq(courseMaterials.courseId, courseId));

		// Step 2: Cancel running background jobs for all materials
		const runIds = extractRunIds(materialsData);
		const jobCancellationResult = await cancelMultipleJobs(runIds);

		// Step 3: Execute comprehensive deletion in transaction
		const deletionResult = await db.transaction(async (tx) => {
			const materialIds = materialsData.map((m) => m.id);

			// Delete AI content and get counts
			const aiContentResult = await deleteAiContentForMaterials(tx, materialIds);

			// Get course weeks count
			const [weeksCountResult] = await tx
				.select({ count: count() })
				.from(courseWeeks)
				.where(eq(courseWeeks.courseId, courseId));

			const weeksCount = weeksCountResult.count;

			// Delete course materials
			if (materialIds.length > 0) {
				await tx.delete(courseMaterials).where(eq(courseMaterials.courseId, courseId));
			}

			// Delete course weeks
			if (weeksCount > 0) {
				await tx.delete(courseWeeks).where(eq(courseWeeks.courseId, courseId));
			}

			// Delete the main course record
			const [deletedCourse] = await tx.delete(courses).where(eq(courses.id, courseId)).returning({
				id: courses.id,
				name: courses.name,
			});

			if (!deletedCourse) {
				throw new Error("Failed to delete course from database.");
			}

			return {
				...deletedCourse,
				materialsDeleted: materialIds.length,
				configsDeleted: aiContentResult.configsDeleted,
				aiContentDeleted: aiContentResult.aiContentDeleted,
				chunksDeleted: aiContentResult.chunksDeleted,
				weeksDeleted: weeksCount,
			};
		});

		// Step 4: Clean up storage files (after successful DB deletion)
		const allFilePaths = extractFilePaths(materialsData);
		const storageResult = await cleanupStorageFiles(allFilePaths);

		// Step 5: Revalidate related pages
		revalidatePath("/dashboard");
		revalidatePath("/dashboard/courses");

		// Return comprehensive deletion summary
		return {
			success: true,
			courseId,
			courseName: deletionResult.name,
			materialsDeleted: deletionResult.materialsDeleted,
			configsDeleted: deletionResult.configsDeleted,
			aiContentDeleted: deletionResult.aiContentDeleted,
			chunksDeleted: deletionResult.chunksDeleted,
			weeksDeleted: deletionResult.weeksDeleted,
			filesDeleted: storageResult.filesDeleted,
			jobsCancelled: jobCancellationResult.jobsCancelled,
			storageErrors: storageResult.hasErrors ? storageResult.storageErrors : undefined,
		};
	} catch (error) {
		// Comprehensive error logging
		const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

		console.error(`Failed to delete course ${courseId}:`, {
			error: errorMessage,
			courseId,
			userId: user.id,
			courseExists: !!course,
			materialsCount: materialsData.length,
		});

		// Re-throw with user-friendly message
		if (error instanceof Error) {
			throw error;
		}

		throw new Error(`Failed to delete course: ${errorMessage}`);
	}
}
