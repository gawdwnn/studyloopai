import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import {
  type ProcessingOptions,
  processDocumentWithTimeout,
} from "@/lib/processing/content-processor";
import { getServerClient } from "@/lib/supabase/server";

/**
 * Process Document API Endpoint
 * Handles PDF processing pipeline with real-time status updates
 */

interface ProcessDocumentRequest {
  materialId: string;
  options?: ProcessingOptions;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body = (await request.json()) as ProcessDocumentRequest;
    const { materialId, options = {} } = body;

    if (!materialId) {
      return NextResponse.json(
        { error: "Material ID is required" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await getServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get material record and verify ownership
    const material = await db.query.courseMaterials.findFirst({
      where: eq(courseMaterials.id, materialId),
      with: {
        uploadedByUser: true,
        course: true,
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this material
    if (material.uploadedBy !== user.id && material.course.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if file exists and is processable
    if (!material.filePath || material.mimeType !== "application/pdf") {
      return NextResponse.json(
        { error: "Material is not a processable PDF" },
        { status: 400 }
      );
    }

    // Update status to processing
    await db
      .update(courseMaterials)
      .set({
        uploadStatus: "processing",
        updatedAt: new Date(),
      })
      .where(eq(courseMaterials.id, materialId));

    // Get file from Supabase Storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from("course-materials")
      .download(material.filePath);

    if (storageError || !fileData) {
      await db
        .update(courseMaterials)
        .set({
          uploadStatus: "failed",
          processingMetadata: {
            processingStatus: "failed",
            lastProcessed: new Date().toISOString(),
            flashcards: { total: 0, completed: 0 },
            multipleChoice: { total: 0, completed: 0 },
            openQuestions: { total: 0, completed: 0 },
            summaries: { total: 0, completed: 0 },
          },
          updatedAt: new Date(),
        })
        .where(eq(courseMaterials.id, materialId));

      return NextResponse.json(
        { error: "Failed to retrieve file from storage" },
        { status: 500 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Process document with progress tracking
    const result = await processDocumentWithTimeout(
      buffer,
      materialId,
      options,
      // Progress callback could be enhanced with WebSocket for real-time updates
      undefined
    );

    // Update material with processing results
    const finalStatus = result.success ? "completed" : "failed";

    await db
      .update(courseMaterials)
      .set({
        uploadStatus: finalStatus,
        processingMetadata: result.processingMetadata,
        updatedAt: new Date(),
      })
      .where(eq(courseMaterials.id, materialId));

    if (result.success) {
      // TODO: Store chunks in vector database for Phase 1.4
      // This would involve:
      // 1. Generate embeddings for each chunk
      // 2. Store in document_chunks table
      // 3. Enable similarity search capabilities

      return NextResponse.json({
        success: true,
        materialId,
        processingTimeMs: result.processingTimeMs,
        stats: {
          textLength: result.extractedText?.length || 0,
          chunkCount: result.chunks?.totalChunks || 0,
          averageChunkSize:
            result.chunks?.processingMetadata.averageChunkSize || 0,
        },
        metadata: result.pdfMetadata,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error,
        materialId,
        processingTimeMs: result.processingTimeMs,
      },
      { status: 422 }
    );
  } catch (error) {
    console.error("Document processing API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      { error: `Processing failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * Get processing status for a material
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get("materialId");

    if (!materialId) {
      return NextResponse.json(
        { error: "Material ID is required" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await getServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get material with processing metadata
    const material = await db.query.courseMaterials.findFirst({
      where: eq(courseMaterials.id, materialId),
      with: {
        course: true,
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (material.uploadedBy !== user.id && material.course.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      materialId,
      uploadStatus: material.uploadStatus,
      processingMetadata: material.processingMetadata,
      fileName: material.fileName,
      fileSize: material.fileSize,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
    });
  } catch (error) {
    console.error("Get processing status API error:", error);

    return NextResponse.json(
      { error: "Failed to get processing status" },
      { status: 500 }
    );
  }
}
