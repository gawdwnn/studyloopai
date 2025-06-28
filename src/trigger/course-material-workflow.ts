import { db } from "@/db";
import { courseMaterials, documentChunks } from "@/db/schema";
import { PDF_PROCESSING_LIMITS } from "@/lib/constants/pdf-processing";
import { generateEmbeddings } from "@/lib/embeddings/embedding-service";
import { parsePDF } from "@/lib/processing/pdf-parser";
import { getAdminClient } from "@/lib/supabase/server";
import { logger, task } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import type { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

type ProcessAndEmbedPayload = {
  materialId: string;
  filePaths: string[];
};

type GenerateAiContentPayload = {
  materialId: string;
};

// Task 1: Process and Embed Material
export const processAndEmbedMaterial = task({
  id: "process-and-embed-material",
  run: async (payload: ProcessAndEmbedPayload) => {
    const { materialId, filePaths } = payload;
    await logger.info("🟢 [TASK 1] Starting processing & embedding", {
      materialId,
    });

    try {
      // 1. Update status to 'processing'
      await db
        .update(courseMaterials)
        .set({
          processingMetadata: { processingStatus: "processing" },
          embeddingStatus: "processing",
        })
        .where(eq(courseMaterials.id, materialId));

      // 2. Download and parse files
      const supabase = getAdminClient();
      let combinedText = "";
      
      await logger.info(`📥 Downloading ${filePaths.length} files`, { filePaths });
      
      for (const path of filePaths) {
        await logger.info(`Downloading file: ${path}`);
        
        const { data, error } = await supabase.storage
          .from("course-materials")
          .download(path);
          
        if (error) {
          await logger.error("Storage download error:", { path, error });
          throw new Error(`Failed to download ${path}: ${error.message || JSON.stringify(error)}`);
        }
        
        if (!data) {
          throw new Error(`No data received for file: ${path}`);
        }
        
        const buffer = Buffer.from(await data.arrayBuffer());
        await logger.info(`File downloaded successfully: ${path}, size: ${buffer.length} bytes`);
        
        // Add buffer validation logging
        const bufferPreview = buffer.toString('utf8', 0, Math.min(50, buffer.length));
        await logger.info(`Buffer preview for ${path}:`, { 
          preview: bufferPreview,
          isPDF: buffer.toString('utf8', 0, 5) === '%PDF-'
        });
        
        const pdfResult = await parsePDF(buffer, {
          cleanText: true,
          timeout: PDF_PROCESSING_LIMITS.MAX_PROCESSING_TIMEOUT,
        });
        
        await logger.info(`PDF parsing result for ${path}:`, {
          success: pdfResult.success,
          hasText: !!pdfResult.text,
          textLength: pdfResult.text?.length || 0,
          error: pdfResult.error,
          metadata: pdfResult.metadata ? {
            pageCount: pdfResult.metadata.pageCount,
            processingTime: pdfResult.metadata.processingTime
          } : null
        });
        
        if (pdfResult.success && pdfResult.text && pdfResult.text.trim()) {
          combinedText += `${pdfResult.text}\n\n`;
          await logger.info(`PDF parsed successfully: ${path}, text length: ${pdfResult.text.length}`);
        } else {
          await logger.error("⚠️ PDF parsing failed or produced no text", {
            path,
            error: pdfResult.error,
            bufferSize: buffer.length,
            isPDF: buffer.toString('utf8', 0, 5) === '%PDF-',
            hasText: !!pdfResult.text,
            textLength: pdfResult.text?.length || 0,
            metadata: pdfResult.metadata
          });
          // Since only PDFs are allowed, this is a critical error
          throw new Error(`Failed to extract text from PDF: ${path}. Error: ${pdfResult.error}`);
        }
      }

      if (!combinedText.trim()) {
        await logger.error("❌ No text extracted from any files", {
          totalFiles: filePaths.length,
          filePaths: filePaths
        });
        throw new Error(`No text could be extracted from any of the ${filePaths.length} files. Please ensure the uploaded files contain readable text content.`);
      }
      
      await logger.info(`📊 Total text extracted: ${combinedText.length} characters from ${filePaths.length} files`);

      // 3. Chunk text
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: PDF_PROCESSING_LIMITS.CHUNK_SIZE,
        chunkOverlap: PDF_PROCESSING_LIMITS.CHUNK_OVERLAP,
      });
      const chunks = await splitter.createDocuments([combinedText]);
      await logger.info(`📝 Split content into ${chunks.length} chunks`);

      // 4. Generate embeddings
      const result = await generateEmbeddings(
        chunks.map((c: Document) => c.pageContent)
      );
      if (!result.success) {
        throw new Error(`Embedding generation failed: ${result.error}`);
      }
      await logger.info("🧠 Generated embeddings for all chunks");

      // 5. Save chunks to database
      const chunksToInsert = result.embeddings.map(
        (embedding: number[], i: number) => ({
          materialId: materialId,
          content: chunks[i].pageContent,
          embedding: embedding,
          chunkIndex: i,
          tokenCount: Math.round(chunks[i].pageContent.length / 4),
        })
      );
      await db.insert(documentChunks).values(chunksToInsert);
      await logger.info(`💾 Saved ${chunksToInsert.length} chunks to database`);

      // 6. Update status to 'embedding_complete'
      await db
        .update(courseMaterials)
        .set({
          embeddingStatus: "completed",
          totalChunks: chunks.length,
          embeddedChunks: chunks.length,
        })
        .where(eq(courseMaterials.id, materialId));

      await logger.info("✅ [TASK 1] Embedding complete", { materialId });

      // 7. Trigger the next task in the chain
      await generateAiContent.trigger({ materialId });

      return { success: true, materialId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      await logger.error("❌ [TASK 1] Processing & embedding failed", {
        materialId,
        error: errorMessage,
      });
      await db
        .update(courseMaterials)
        .set({
          processingMetadata: { processingStatus: "failed" },
          embeddingStatus: "failed",
        })
        .where(eq(courseMaterials.id, materialId));
      throw error;
    }
  },
});

// Task 2: Generate AI Content
export const generateAiContent = task({
  id: "generate-ai-content",
  run: async (payload: GenerateAiContentPayload) => {
    const { materialId } = payload;
    await logger.info("🟢 [TASK 2] Starting AI content generation", {
      materialId,
    });

    try {
      // For now, this task is a placeholder.
      // In the future, it will fetch chunks and generate content.
      await logger.info(
        "🧠 AI Content Generation logic will be implemented here."
      );
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work

      // Finally, update the overall status to 'completed'
      await db
        .update(courseMaterials)
        .set({
          processingMetadata: { processingStatus: "completed" },
        })
        .where(eq(courseMaterials.id, materialId));

      await logger.info("✅ [TASK 2] AI content generation complete", {
        materialId,
      });

      return { success: true, materialId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      await logger.error("❌ [TASK 2] AI content generation failed", {
        materialId,
        error: errorMessage,
      });
      await db
        .update(courseMaterials)
        .set({
          processingMetadata: { processingStatus: "failed" },
        })
        .where(eq(courseMaterials.id, materialId));
      throw error;
    }
  },
});
