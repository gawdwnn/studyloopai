"use server";

import { db } from "@/db";
import { courseMaterials, courses } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import {
  type CourseCreationData,
  CourseCreationSchema,
} from "@/lib/validations/courses";
import { eq } from "drizzle-orm";
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

  revalidatePath("/dashboard/course-materials");
  return newCourse;
}

export async function getUserCourses() {
  const userCourses = await db.query.courses.findMany();

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
    orderBy: (courseMaterials, { desc }) => [desc(courseMaterials.createdAt)],
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
    orderBy: (courseMaterials, { desc }) => [desc(courseMaterials.createdAt)],
  });

  return materials;
}
