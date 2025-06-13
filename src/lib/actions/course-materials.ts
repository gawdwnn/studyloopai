"use server";

import { db } from "@/db";
import { courseMaterials, courseWeeks } from "@/db/schema";
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

  // Get the week ID from the week number and course ID
  const week = await db.query.courseWeeks.findFirst({
    where: and(
      eq(courseWeeks.courseId, material.courseId),
      eq(courseWeeks.weekNumber, material.weekNumber)
    ),
  });

  if (!week) {
    // Optionally, create the week if it doesn't exist
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

export async function deleteCourseMaterial(materialId: string) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to delete course materials.");
  }

  const material = await db.query.courseMaterials.findFirst({
    where: eq(courseMaterials.id, materialId),
  });

  // If material is null, either it doesn't exist or user doesn't have access
  // RLS handles the access control, so we just return early
  if (!material) {
    // Don't throw an error - RLS may have filtered it out due to access control
    return;
  }

  // Delete the file from Supabase Storage if it exists
  if (material.filePath) {
    try {
      const { error: storageError } = await supabase.storage
        .from("course-materials")
        .remove([material.filePath]);

      if (storageError) {
        console.error("Failed to delete file from storage:", storageError);
        // Continue with database deletion even if storage deletion fails
      }
    } catch (error) {
      console.error("Error deleting file from storage:", error);
      // Continue with database deletion even if storage deletion fails
    }
  }

  // This will also cascade delete related document_chunks and generated_content
  await db.delete(courseMaterials).where(eq(courseMaterials.id, materialId));

  // Revalidate the course materials page
  revalidatePath("/dashboard/course-materials");
  revalidatePath(`/dashboard/course-materials/${material.courseId}`);
}
