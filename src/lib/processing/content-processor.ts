import type { ProcessingMetadata } from "../../db/schema";
import { costOptimization, processingLimits } from "../ai/config";
import {
  type ChunkingOptions,
  type ChunkingResult,
  DEFAULT_CHUNKING_OPTIONS,
  chunkDocument,
} from "./document-chunker";
import { type PDFParseResult, parsePDF, validatePDFBuffer } from "./pdf-parser";

/**
 * Content Processor for StudyLoop AI
 * Main pipeline for processing uploaded documents
 * Cost-optimized for minimal token usage and free xAI integration
 */

export interface ProcessingOptions {
  chunkingOptions?: Partial<ChunkingOptions>;
  enablePreprocessing?: boolean;
  extractMetadata?: boolean;
  validateBeforeProcessing?: boolean;
  costOptimized?: boolean; // New option for cost optimization
}

export interface ProcessingResult {
  success: boolean;
  materialId?: string;
  extractedText?: string;
  chunks?: ChunkingResult;
  pdfMetadata?: PDFParseResult["metadata"];
  processingMetadata: ProcessingMetadata;
  error?: string;
  processingTimeMs: number;
  costOptimization?: {
    chunksGenerated: number;
    estimatedTokens: number;
    strategy: string;
  };
}

export interface ProcessingProgress {
  stage: "validation" | "extraction" | "chunking" | "complete" | "error";
  progress: number; // 0-100
  message: string;
  timestamp: string;
}

/**
 * Process uploaded PDF document through the complete pipeline
 * Cost-optimized version prioritizing free xAI and minimal token usage
 */
export async function processDocument(
  buffer: Buffer,
  materialId: string,
  options: ProcessingOptions = {},
  onProgress?: (progress: ProcessingProgress) => void
): Promise<ProcessingResult> {
  const startTime = Date.now();

  const reportProgress = (
    stage: ProcessingProgress["stage"],
    progress: number,
    message: string
  ) => {
    if (onProgress) {
      onProgress({
        stage,
        progress,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  try {
    reportProgress("validation", 10, "Validating PDF file...");

    // Validate PDF if requested
    if (options.validateBeforeProcessing !== false) {
      const validation = validatePDFBuffer(buffer);
      if (!validation.isValid) {
        throw new Error(`Invalid PDF: ${validation.error}`);
      }
    }

    reportProgress("extraction", 30, "Extracting text from PDF...");

    // Extract text from PDF
    const pdfResult = await parsePDF(buffer, {
      cleanText: options.enablePreprocessing !== false,
      extractPagewise: options.extractMetadata === true,
    });

    if (!pdfResult.success || !pdfResult.text) {
      throw new Error(pdfResult.error || "Failed to extract text from PDF");
    }

    reportProgress(
      "chunking",
      70,
      "Chunking document for cost-optimized AI processing..."
    );

    // Use cost-optimized chunking options
    const chunkingOptions =
      options.costOptimized !== false
        ? {
            ...DEFAULT_CHUNKING_OPTIONS,
            chunkSize: costOptimization.preferredChunkSize,
            overlapSize: costOptimization.preferredOverlapSize,
            ...options.chunkingOptions,
          }
        : {
            ...DEFAULT_CHUNKING_OPTIONS,
            ...options.chunkingOptions,
          };

    const chunkingResult = chunkDocument(pdfResult.text, chunkingOptions);

    if (chunkingResult.totalChunks === 0) {
      throw new Error("No content chunks generated from document");
    }

    reportProgress("complete", 100, "Document processing complete");

    const processingTimeMs = Date.now() - startTime;

    // Calculate cost optimization metrics
    const estimatedTokens = chunkingResult.chunks.reduce((total, chunk) => {
      // Rough estimation: 1 token ≈ 4 characters
      return total + Math.ceil(chunk.content.length / 4);
    }, 0);

    // Build processing metadata
    const processingMetadata: ProcessingMetadata = {
      processingStatus: "completed",
      lastProcessed: new Date().toISOString(),
      flashcards: { total: 0, completed: 0 },
      multipleChoice: { total: 0, completed: 0 },
      openQuestions: { total: 0, completed: 0 },
      summaries: { total: 0, completed: 0 },
    };

    return {
      success: true,
      materialId,
      extractedText: pdfResult.text,
      chunks: chunkingResult,
      pdfMetadata: pdfResult.metadata,
      processingMetadata,
      processingTimeMs,
      costOptimization: {
        chunksGenerated: chunkingResult.totalChunks,
        estimatedTokens,
        strategy:
          options.costOptimized !== false ? "cost-optimized" : "standard",
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown processing error";
    const processingTimeMs = Date.now() - startTime;

    reportProgress("error", 0, `Processing failed: ${errorMessage}`);

    // Log detailed error for debugging (but not console.log for production)
    if (process.env.NODE_ENV === "development") {
      console.error("Document processing failed:", {
        materialId,
        error: errorMessage,
        bufferSize: buffer?.length || 0,
        processingTimeMs,
        timestamp: new Date().toISOString(),
      });
    }

    const processingMetadata: ProcessingMetadata = {
      processingStatus: "failed",
      lastProcessed: new Date().toISOString(),
      flashcards: { total: 0, completed: 0 },
      multipleChoice: { total: 0, completed: 0 },
      openQuestions: { total: 0, completed: 0 },
      summaries: { total: 0, completed: 0 },
    };

    return {
      success: false,
      materialId,
      processingMetadata,
      error: errorMessage,
      processingTimeMs,
    };
  }
}

/**
 * Process document with timeout protection
 */
export async function processDocumentWithTimeout(
  buffer: Buffer,
  materialId: string,
  options: ProcessingOptions = {},
  onProgress?: (progress: ProcessingProgress) => void,
  timeoutMs: number = processingLimits.timeout
): Promise<ProcessingResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Document processing timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    processDocument(buffer, materialId, options, onProgress)
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

/**
 * Cost-optimized document processing with strict token limits
 */
export async function processDocumentCostOptimized(
  buffer: Buffer,
  materialId: string,
  maxTokenBudget = 2000,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<ProcessingResult> {
  // Calculate optimal chunk size based on token budget
  const estimatedTokensPerChar = 0.25;
  const maxCharsForBudget = Math.floor(maxTokenBudget / estimatedTokensPerChar);

  const costOptimizedOptions: ProcessingOptions = {
    costOptimized: true,
    chunkingOptions: {
      chunkSize: Math.min(
        costOptimization.preferredChunkSize,
        maxCharsForBudget * 0.6
      ),
      overlapSize: Math.min(costOptimization.preferredOverlapSize, 100),
      preserveSentences: true,
      preserveParagraphs: false, // Disable for tighter control
    },
    enablePreprocessing: true,
    extractMetadata: false, // Disable to save processing time
    validateBeforeProcessing: true,
  };

  return processDocument(buffer, materialId, costOptimizedOptions, onProgress);
}

/**
 * Preprocess document text for better AI processing
 */
export function preprocessDocumentText(text: string): string {
  return (
    text
      // Remove excessive whitespace while preserving structure
      .replace(/[ \t]+/g, " ")
      // Normalize line endings
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Remove multiple consecutive empty lines (preserve max 2)
      .replace(/\n{4,}/g, "\n\n\n")
      // Clean up common PDF artifacts
      .replace(/\f/g, "\n\n") // Form feeds to double newlines
      .replace(/[^\S\n]+$/gm, "") // Trailing whitespace on lines
      // Remove standalone page numbers (common PDF artifact)
      .replace(/^\s*\d+\s*$/gm, "")
      // Clean up hyphenated words split across lines
      .replace(/(\w)-\n(\w)/g, "$1$2")
      // Trim the entire text
      .trim()
  );
}

/**
 * Validate processing result
 */
export function validateProcessingResult(result: ProcessingResult): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!result.success) {
    issues.push("Processing marked as failed");
  }

  if (result.success && !result.extractedText) {
    issues.push("No extracted text despite successful processing");
  }

  if (result.success && (!result.chunks || result.chunks.totalChunks === 0)) {
    issues.push("No chunks generated despite successful processing");
  }

  if (result.extractedText && result.extractedText.length < 50) {
    issues.push("Extracted text is suspiciously short");
  }

  if (result.chunks && result.chunks.totalChunks > 50) {
    issues.push("Generated high number of chunks - consider cost optimization");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Get processing statistics with cost analysis
 */
export function getProcessingStats(result: ProcessingResult): {
  textLength: number;
  chunkCount: number;
  averageChunkSize: number;
  processingSpeed: number; // chars per second
  efficiency: string;
  costMetrics: {
    estimatedTokens: number;
    estimatedCost: string;
    strategy: string;
  };
} {
  const textLength = result.extractedText?.length || 0;
  const chunkCount = result.chunks?.totalChunks || 0;
  const averageChunkSize =
    result.chunks?.processingMetadata.averageChunkSize || 0;
  const processingSpeed =
    textLength > 0 && result.processingTimeMs > 0
      ? Math.round(textLength / (result.processingTimeMs / 1000))
      : 0;

  let efficiency = "unknown";
  if (processingSpeed > 10000) efficiency = "excellent";
  else if (processingSpeed > 5000) efficiency = "good";
  else if (processingSpeed > 1000) efficiency = "fair";
  else if (processingSpeed > 0) efficiency = "slow";

  // Cost estimation (xAI is free on Vercel, OpenAI embeddings cost ~$0.0001/1K tokens)
  const estimatedTokens =
    result.costOptimization?.estimatedTokens || Math.ceil(textLength / 4);

  const estimatedCost =
    result.costOptimization?.strategy === "cost-optimized"
      ? "FREE (xAI via Vercel)"
      : `~$${((estimatedTokens / 1000) * 0.0001).toFixed(6)} (if using OpenAI)`;

  return {
    textLength,
    chunkCount,
    averageChunkSize,
    processingSpeed,
    efficiency,
    costMetrics: {
      estimatedTokens,
      estimatedCost,
      strategy: result.costOptimization?.strategy || "standard",
    },
  };
}
