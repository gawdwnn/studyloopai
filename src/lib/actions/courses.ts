"use server";

import { db } from "@/db";
import { courses } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import {
  type CourseCreationData,
  CourseCreationSchema,
} from "@/lib/validations/courses";
import { and, eq } from "drizzle-orm";
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

  revalidatePath("/dashboard/materials");
  return newCourse;
}

export async function getUserCourses() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const userCourses = await db.query.courses.findMany({
    where: eq(courses.userId, user.id),
  });

  return userCourses;
}

export async function getCourseById(courseId: string) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.userId, user.id)),
  });

  return course;
}
