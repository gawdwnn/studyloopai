"use server";

import type {
  GenerationConfig,
  UploadData,
} from "@/components/course/course-material-upload-wizard";
import { db } from "@/db";
import { courseMaterials, courses } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { errorAnalytics, withErrorTracking } from "@/lib/utils/error-analytics";
import { withRetry } from "@/lib/utils/retry";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface ProcessingResult {
  success: boolean;
  materialId?: string;
  error?: string;
  generatedContent?: {
    goldenNotes: string[];
    flashcards: Array<{ question: string; answer: string }>;
    summary: string;
    examExercises: Array<{ question: string; expectedAnswer: string }>;
    mcqExercises: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }>;
  };
}

export async function uploadAndGenerateContent(
  uploadData: UploadData
): Promise<ProcessingResult> {
  return withErrorTracking(
    async () => {
      const supabase = await getServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to upload content.");
      }

      // Validate course ownership with retry logic
      const course = await withRetry(
        async () => {
          const courseData = await db.query.courses.findFirst({
            where: eq(courses.id, uploadData.courseId),
          });

          if (!courseData || courseData.userId !== user.id) {
            throw new Error("Course not found or access denied.");
          }

          return courseData;
        },
        { maxAttempts: 3, baseDelay: 1000 }
      );

      if (!course.success) {
        throw (
          course.error || new Error("Failed to validate course after retries")
        );
      }

      // Upload files with retry and error handling
      const uploadResults = await withErrorTracking(
        () =>
          uploadFilesToStorage(uploadData.files, {
            userId: user.id,
            courseId: uploadData.courseId,
            weekNumber: uploadData.weekNumber,
          }),
        "upload_error",
        { fileCount: uploadData.files.length, courseId: uploadData.courseId }
      );

      // Create course material records with transaction safety
      const materialPromises = uploadResults.map(async (uploadResult) => {
        return withRetry(
          async () => {
            const [material] = await db
              .insert(courseMaterials)
              .values({
                courseId: uploadData.courseId,
                title: uploadResult.fileName,
                fileName: uploadResult.fileName,
                filePath: uploadResult.filePath,
                fileSize: uploadResult.fileSize,
                mimeType: uploadResult.mimeType,
                uploadStatus: "processing",
                processingMetadata: {
                  weekName: uploadData.weekName,
                  outputLanguage: uploadData.outputLanguage,
                  generationConfig: uploadData.generationConfig,
                  processingStatus: "pending",
                  startTime: new Date().toISOString(),
                },
                uploadedBy: user.id,
              })
              .returning();

            return material;
          },
          { maxAttempts: 3, baseDelay: 500 }
        );
      });

      const materialResults = await Promise.all(materialPromises);
      const failedMaterials = materialResults.filter(
        (result) => !result.success
      );

      if (failedMaterials.length > 0) {
        errorAnalytics.logError(
          "processing_error",
          "Failed to create material records",
          { failedCount: failedMaterials.length }
        );
        throw new Error(
          `Failed to create ${failedMaterials.length} material records`
        );
      }

      const primaryMaterial = materialResults[0]?.data;
      if (!primaryMaterial) {
        throw new Error("Failed to create material record.");
      }

      // Process documents with enhanced error handling
      const documentTexts = await withErrorTracking(
        () => processDocuments(uploadResults),
        "processing_error",
        { documentCount: uploadResults.length }
      );

      // Generate AI content with retry logic
      const generatedContent = await withRetry(
        () =>
          generateAIContent(
            documentTexts,
            uploadData.generationConfig,
            uploadData.outputLanguage
          ),
        {
          maxAttempts: 3,
          baseDelay: 2000,
          shouldRetry: (error) => {
            // Retry on network errors and rate limits, but not on validation errors
            return (
              !error.message.includes("validation") &&
              !error.message.includes("invalid")
            );
          },
        }
      );

      if (!generatedContent.success) {
        await updateMaterialStatus(
          primaryMaterial.id,
          "failed",
          generatedContent.error?.message
        );
        throw (
          generatedContent.error ||
          new Error("Content generation failed after retries")
        );
      }

      // Update material status with retry
      await withRetry(
        () => updateMaterialStatus(primaryMaterial.id, "completed"),
        { maxAttempts: 3, baseDelay: 500 }
      );

      revalidatePath("/dashboard/course-materials");
      revalidatePath(`/dashboard/courses/${uploadData.courseId}`);

      return {
        success: true,
        materialId: primaryMaterial.id,
        generatedContent: generatedContent.data,
      };
    },
    "processing_error",
    {
      courseId: uploadData.courseId,
      weekNumber: uploadData.weekNumber,
      fileCount: uploadData.files.length,
    }
  );
}

// Enhanced helper function with better error handling
async function updateMaterialStatus(
  materialId: string,
  status: "processing" | "completed" | "failed",
  errorMessage?: string
): Promise<void> {
  await db
    .update(courseMaterials)
    .set({
      uploadStatus: status,
      processingMetadata: {
        processingStatus: status,
        lastProcessed: new Date().toISOString(),
        ...(errorMessage && { error: errorMessage }),
      },
    })
    .where(eq(courseMaterials.id, materialId));
}

// Placeholder functions with enhanced error handling

interface UploadResult {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

async function uploadFilesToStorage(
  _files: File[],
  _context: { userId: string; courseId: string; weekNumber: number }
): Promise<UploadResult[]> {
  // TODO: Implement actual file upload to storage (e.g., Supabase Storage)
  throw new Error("File upload functionality not yet implemented");
}

async function processDocuments(
  _uploadResults: UploadResult[]
): Promise<string[]> {
  // TODO: Implement actual document processing (PDF extraction, text parsing, etc.)
  throw new Error("Document processing functionality not yet implemented");
}

async function generateAIContent(
  _documentTexts: string[],
  _config: GenerationConfig,
  _outputLanguage: string
): Promise<ProcessingResult["generatedContent"]> {
  // TODO: Implement actual AI content generation (OpenAI, Claude, etc.)
  throw new Error("AI content generation functionality not yet implemented");
}

export async function getGeneratedContent(materialId: string) {
  return withErrorTracking(
    async () => {
      const material = await db.query.courseMaterials.findFirst({
        where: eq(courseMaterials.id, materialId),
      });

      return material?.processingMetadata;
    },
    "processing_error",
    { materialId }
  );
}

export async function regenerateContent(
  _materialId: string,
  _newConfig: GenerationConfig
): Promise<ProcessingResult> {
  return withErrorTracking(
    async () => {
      // TODO: Implement content regeneration logic
      throw new Error("Content regeneration functionality not yet implemented");
    },
    "processing_error",
    { materialId: _materialId, config: _newConfig }
  );
}
