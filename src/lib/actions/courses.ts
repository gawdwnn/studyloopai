"use server";

import { db } from "@/db";
import { courseMaterials, courseWeeks, courses, generationConfigs } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { type CourseCreationData, CourseCreationSchema } from "@/lib/validations/courses";
import { asc, desc, eq, inArray } from "drizzle-orm";
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

export async function getCourseMaterials(courseId: string) {
	return await withErrorHandling(
		async () => {
			const materials = await db.query.courseMaterials.findMany({
				where: eq(courseMaterials.courseId, courseId),
				with: {
					courseWeek: {
						columns: {
							weekNumber: true,
						},
					},
				},
				orderBy: desc(courseMaterials.createdAt),
			});
			return materials;
		},
		"getCourseMaterials",
		[] // fallback empty array
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

// TODO: make delete course async
export async function deleteCourse(courseId: string) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("You must be logged in to delete a course.");
		}

		// Get all material IDs for this course first
		const materialIds = await db
			.select({ id: courseMaterials.id })
			.from(courseMaterials)
			.where(eq(courseMaterials.courseId, courseId));

		// Delete generation configs for all materials in this course
		if (materialIds.length > 0) {
			await db.delete(generationConfigs).where(
				inArray(
					generationConfigs.materialId,
					materialIds.map((m) => m.id)
				)
			);
		}

		// Delete course materials (cascade)
		await db.delete(courseMaterials).where(eq(courseMaterials.courseId, courseId));

		// Delete course weeks
		await db.delete(courseWeeks).where(eq(courseWeeks.courseId, courseId));

		// Delete the course
		await db.delete(courses).where(eq(courses.id, courseId));

		revalidatePath("/dashboard");
	} catch (error) {
		console.error("Failed to delete course:", error);

		// Re-throw for UI error handling, but with user-friendly message
		if (error instanceof Error && error.message.includes("logged in")) {
			throw error; // Auth errors should be thrown as-is
		}

		throw new Error("Failed to delete course. Please try again.");
	}
}
