"use server";

import type { UploadData } from "@/components/course/course-material-upload-wizard";
import { db } from "@/db";
import { courseMaterials, courses } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { processAndEmbedMaterial } from "@/trigger";
import { eq } from "drizzle-orm";

export async function uploadAndGenerateContent(
  uploadData: UploadData
): Promise<
  { success: true; runId: string } | { success: false; error: string }
> {
  try {
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const courseData = await db.query.courses.findFirst({
      where: eq(courses.id, uploadData.courseId),
    });

    if (!courseData || courseData.userId !== user.id) {
      return { success: false, error: "Course not found or access denied" };
    }


    // 1. Create a single CourseMaterial entry to track this job
    const [material] = await db
      .insert(courseMaterials)
      .values({
        courseId: uploadData.courseId,
        weekId: uploadData.weekId,
        title:
          uploadData.files.map((f) => f.name).join(", ") || "Generated Content",
        uploadStatus: "pending",
        processingMetadata: { processingStatus: "pending" },
        uploadedBy: user.id,
      })
      .returning();

    // 2. Upload files to Supabase Storage under the new materialId
    const uploadedFilePaths = await Promise.all(
      uploadData.files.map(async (file) => {
        const filePath = `${user.id}/${material.id}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("course-materials")
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(
            `Failed to upload ${file.name}: ${uploadError.message}`
          );
        }
        return filePath;
      })
    );

    // Update the material with file paths
    await db
      .update(courseMaterials)
      .set({
        filePath: uploadedFilePaths[0], // Store primary file path
        uploadStatus: "completed",
      })
      .where(eq(courseMaterials.id, material.id));

    // 3. Trigger the content generation task
    const payload = {
      materialId: material.id,
      userId: user.id,
      filePaths: uploadedFilePaths,
      generationConfig: uploadData.generationConfig,
    };

    const handle = await processAndEmbedMaterial.trigger(payload);

    // Update the material with the runId for client-side status tracking
    await db
      .update(courseMaterials)
      .set({ runId: handle.id })
      .where(eq(courseMaterials.id, material.id));

    return { success: true, runId: handle.id };
  } catch (error) {
    console.error("Failed to trigger content generation:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
