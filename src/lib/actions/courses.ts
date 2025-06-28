"use server";

import { db } from "@/db";
import { courseMaterials, courseWeeks, courses } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import {
  type CourseCreationData,
  CourseCreationSchema,
} from "@/lib/validations/courses";
import { asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createCourse(formData: CourseCreationData) {
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
}

export async function getUserCourses() {
  const userCourses = await db.query.courses.findMany({
    orderBy: desc(courses.createdAt),
  });

  return userCourses;
}

export async function getCourseById(courseId: string) {
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
  });

  return course;
}

export async function getCourseMaterials(courseId: string) {
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
}

export async function getAllUserMaterials() {
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
}

export async function getCourseWeeks(courseId: string) {
  const weeks = await db.query.courseWeeks.findMany({
    where: eq(courseWeeks.courseId, courseId),
    orderBy: asc(courseWeeks.weekNumber),
  });

  return weeks;
}

export async function updateCourse(courseId: string, data: Partial<CourseCreationData>) {
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
}

export async function deleteCourse(courseId: string) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to delete a course.");
  }

  // Delete course materials first (cascade)
  await db.delete(courseMaterials).where(eq(courseMaterials.courseId, courseId));
  
  // Delete course weeks
  await db.delete(courseWeeks).where(eq(courseWeeks.courseId, courseId));
  
  // Delete the course
  await db.delete(courses).where(eq(courses.id, courseId));

  revalidatePath("/dashboard");
}
