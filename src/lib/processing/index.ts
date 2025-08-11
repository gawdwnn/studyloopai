// Main document processing integration
import { logger } from "@/lib/utils/logger";
import { DOCUMENT_PROCESSING_CONFIG, PROCESSING_ERROR_MESSAGES } from "../config/document-processing";
import { getDocumentProcessor } from "./processor-factory";
import type { Environment, ProcessingOptions, ProcessingResult } from "./types";

// Export types and functions
export {
	getDocumentLimits,
	getSupportedFileTypes
} from "../config/document-processing";
export { getDocumentProcessor } from "./processor-factory";
export type {
	DocumentProcessor,
	ProcessingMetadata,
	ProcessingOptions,
	ProcessingResult
} from "./types";

// Main function to process documents - integrates with existing Trigger.dev workflow
export async function processDocument(
	buffer: Buffer,
	mimeType: string,
	options: {
		userId: string;
		materialId: string;
		timeout?: number;
		environment?: Environment;
	}
): Promise<ProcessingResult> {
	const startTime = Date.now();

	try {
		// Validate inputs
		if (!buffer || buffer.length === 0) {
			throw new Error("Invalid or empty document buffer");
		}

		if (!options.userId || !options.materialId) {
			throw new Error("User ID and Material ID are required");
		}

    // Get appropriate document processor
    const processor = await getDocumentProcessor(
      mimeType,
      options.environment ||
        (process.env.NODE_ENV as Environment) ||
        "development",
      options.userId,
      buffer.length
    );

		logger.info("Starting document processing", {
			// processor name is encoded in result metadata; omit here to avoid 'any'
			mimeType,
			fileSize: buffer.length,
			userId: options.userId,
			materialId: options.materialId,
		});

		// Process the document
		const processingOptions: ProcessingOptions = {
			userId: options.userId,
			materialId: options.materialId,
		};

    // Enforce timeout for processing
    const timeoutMs = options.timeout ?? DOCUMENT_PROCESSING_CONFIG.PROCESSING.timeout;
    const result = await Promise.race<ProcessingResult>([
      processor.process(buffer, processingOptions),
      new Promise<ProcessingResult>((_, reject) =>
        setTimeout(() => reject(new Error("PROCESSING_TIMEOUT")), timeoutMs)
      ),
    ]);

		const totalTime = Date.now() - startTime;
		logger.info("Document processing completed", {
			success: result.success,
			textLength: result.text.length,
			source: result.metadata.source,
			processor: result.metadata.processor,
			userId: options.userId,
			materialId: options.materialId,
		});

		return result;
	} catch (error) {
		const processingTime = Date.now() - startTime;
		const errorMessage = error instanceof Error ? error.message : String(error);

		logger.error("Document processing failed", {
			error: errorMessage,
			userId: options.userId,
			materialId: options.materialId,
			mimeType,
			fileSize: buffer.length,
		});

    return {
			success: false,
			text: "",
      error:
        errorMessage === "PROCESSING_TIMEOUT"
          ? PROCESSING_ERROR_MESSAGES.PROCESSING_TIMEOUT
          : errorMessage,
			metadata: {
				processor: "unknown",
				source: "text-extraction",
				warnings: ["Document processing failed"],
			},
		};
	}
}

// Utility function to check if a document type is supported
export function isSupportedDocumentType(mimeType: string): boolean {
	// Align with single source of truth in configuration
	const allMimeTypes: string[] = Object.values(
		DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES
	).flatMap((t) => t.mimeTypes as unknown as string[]);
	return allMimeTypes.includes(mimeType);
}
