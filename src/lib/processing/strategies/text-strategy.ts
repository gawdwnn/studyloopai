import { DOCUMENT_PROCESSING_CONFIG } from "@/lib/config/document-processing";
import { logger } from "@/lib/utils/logger";
import type { ProcessingOptions, ProcessingResult } from "../types";
import type { ProcessorStrategy } from "./base-strategy";
import {
	createMimeTypeCanProcess,
	createProcessingResult,
} from "./base-strategy";

/**
 * Text Document Processing Strategy
 * Handles plain text, markdown, and CSV files
 */
async function processTextDocument(
	buffer: Buffer,
	_options: ProcessingOptions
): Promise<ProcessingResult> {
	try {
		logger.info("Starting text document processing", {
			bufferSize: buffer.length,
			strategy: "text",
		});

		// Convert buffer to UTF-8 text
		const rawText = buffer.toString("utf8");

		if (!rawText || rawText.trim().length === 0) {
			throw new Error("No text content found in document");
		}

		// Single trimmed emptiness check is sufficient

		logger.info("Text document processing completed", {
			extractedTextLength: rawText.length,
		});

		return createProcessingResult("text", true, rawText, "text-extraction");
	} catch (error) {
		logger.error("Text document processing failed", {
			error: error instanceof Error ? error.message : String(error),
			bufferSize: buffer.length,
		});

		return createProcessingResult(
			"text",
			false,
			"",
			"text-extraction",
			error instanceof Error ? error.message : String(error)
		);
	}
}

// Supported MIME types for text documents (from config)
const SUPPORTED_TEXT_TYPES =
	DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES.TEXT.mimeTypes;

// Text Document Processing Strategy Implementation
export const TextStrategy: ProcessorStrategy = {
	name: "text",
	canProcess: createMimeTypeCanProcess(SUPPORTED_TEXT_TYPES),
	process: processTextDocument,
};
