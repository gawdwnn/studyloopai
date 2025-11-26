"use server";

import { db } from "@/db";
import { courseMaterials, courseWeeks, courses } from "@/db/schema";
import { cacheInvalidate } from "@/lib/cache";
import { checkCourseRateLimit, enforceRateLimit } from "@/lib/rate-limit";
import { deleteContentForCourse } from "@/lib/services/content-deletion-service";
import {
	cleanupStorageFiles,
	extractFilePaths,
} from "@/lib/services/storage-cleanup-service";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { logger } from "@/lib/utils/logger";
import {
	type CourseCreationData,
	CourseCreationSchema,
} from "@/lib/validation/courses";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
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

		// Rate limit course creation - prevent spam courses
		await enforceRateLimit(
			() => checkCourseRateLimit(user.id),
			"course_creation"
		);

		const validatedData = CourseCreationSchema.parse(formData);

		const [newCourse] = await db
			.insert(courses)
			.values({
				...validatedData,
				userId: user.id,
			})
			.returning();

		// Create course weeks based on durationWeeks
		const weeks = Array.from(
			{ length: newCourse.durationWeeks || 12 },
			(_, i) => ({
				courseId: newCourse.id,
				weekNumber: i + 1,
				title: `Week ${i + 1}`,
			})
		);

		await db.insert(courseWeeks).values(weeks);

		revalidatePath("/dashboard");
		return newCourse;
	} catch (error) {
		logger.error(
			{
				err: error,
				action: "createCourse",
				courseData: {
					name: formData.name,
					durationWeeks: formData.durationWeeks,
				},
			},
			"Failed to create course"
		);

		// Re-throw for UI error handling, but with user-friendly message
		if (error instanceof Error && error.message.includes("logged in")) {
			throw error; // Auth errors should be thrown as-is
		}

		throw new Error("Failed to create course. Please try again.");
	}
}

export async function getUserCourses() {
	const {
		data: { user },
	} = await (await getServerClient()).auth.getUser();
	if (!user) return []; // Return empty array for unauthenticated users

	return await withErrorHandling(
		async () => {
			const userCourses = await db.query.courses.findMany({
				where: eq(courses.userId, user.id),
				orderBy: desc(courses.createdAt),
			});
			return userCourses;
		},
		"getUserCourses",
		[]
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
		null
	);
}

export async function getAllUserMaterials() {
	const {
		data: { user },
	} = await (await getServerClient()).auth.getUser();
	if (!user) return []; // Return empty array for unauthenticated users

	return await withErrorHandling(
		async () => {
			// Get user's course IDs first
			const userCourses = await db
				.select({ id: courses.id })
				.from(courses)
				.where(eq(courses.userId, user.id));

			const courseIds = userCourses.map((c) => c.id);

			if (courseIds.length === 0) {
				return [];
			}

			// Query materials for user's courses only
			const materials = await db.query.courseMaterials.findMany({
				where: inArray(courseMaterials.courseId, courseIds),
				with: {
					courseWeek: {
						columns: {
							weekNumber: true,
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
		[]
	);
}

export async function getCourseWeeks(
	courseId: string,
	options?: {
		onlyWithMaterials?: boolean;
	}
) {
	return await withErrorHandling(
		async () => {
			const conditions = [eq(courseWeeks.courseId, courseId)];

			if (options?.onlyWithMaterials) {
				conditions.push(eq(courseWeeks.hasMaterials, true));
			}

			const weeks = await db.query.courseWeeks.findMany({
				where: and(...conditions),
				orderBy: asc(courseWeeks.weekNumber),
			});

			return weeks;
		},
		"getCourseWeeks",
		[]
	);
}

export async function updateCourse(
	courseId: string,
	data: Partial<CourseCreationData>
) {
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
		logger.error(
			{
				err: error,
				action: "updateCourse",
				courseId,
				updateData: data,
			},
			"Failed to update course"
		);

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

	let course: { id: string; name: string; userId: string } | undefined;

	try {
		// Step 1: Fetch course with ownership verification and get all related data
		course = await db.query.courses.findFirst({
			where: eq(courses.id, courseId),
			columns: { id: true, name: true, userId: true },
		});

		if (!course) {
			throw new Error(
				"Course not found or you don't have permission to delete it."
			);
		}

		// Verify ownership
		if (course.userId !== user.id) {
			throw new Error("You don't have permission to delete this course.");
		}

		// Step 2: Get all course materials for file cleanup
		const materialsData = await db.query.courseMaterials.findMany({
			where: eq(courseMaterials.courseId, courseId),
			columns: { id: true, filePath: true },
		});

		// Step 3: Execute comprehensive deletion in transaction
		await db.transaction(async (tx) => {
			const materialIds = materialsData.map((m) => m.id);

			// Delete all content for the course (AI content, materials, weeks, configs, chunks)
			const contentResult = await deleteContentForCourse(
				tx,
				courseId,
				materialIds
			);

			// Delete the main course record
			const [deletedCourse] = await tx
				.delete(courses)
				.where(eq(courses.id, courseId))
				.returning({
					id: courses.id,
					name: courses.name,
				});

			if (!deletedCourse) {
				throw new Error("Failed to delete course from database.");
			}

			return {
				...deletedCourse,
				...contentResult,
			};
		});

		// Step 4: Clean up storage files (after successful DB deletion)
		const allFilePaths = extractFilePaths(materialsData);
		await cleanupStorageFiles(allFilePaths);

		// Step 5: Invalidate caches and revalidate pages
		await cacheInvalidate(`*${courseId}*`);

		revalidatePath("/dashboard");
		revalidatePath("/dashboard/courses");

		// Return comprehensive deletion summary
		return {
			success: true,
		};
	} catch (error) {
		// Comprehensive error logging
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";

		logger.error(
			{
				err: error,
				action: "deleteCourse",
				courseId,
				userId: user.id,
				courseExists: !!course,
			},
			"Failed to delete course"
		);

		// Re-throw with user-friendly message
		if (error instanceof Error) {
			throw error;
		}

		throw new Error(`Failed to delete course: ${errorMessage}`);
	}
}
