import { DOCUMENT_PROCESSING_CONFIG } from "@/lib/config/document-processing";
import { logger } from "@/lib/utils/logger";
import type { ProcessingOptions, ProcessingResult } from "../types";
import type { ProcessorStrategy } from "./base-strategy";
import {
	createMimeTypeCanProcess,
	createProcessingResult,
} from "./base-strategy";

/**
 * Office Document Processing Strategy
 * Handles Word, Excel, PowerPoint, and other Office formats
 */
const process = async (
	buffer: Buffer,
	_options: ProcessingOptions
): Promise<ProcessingResult> => {
	try {
		logger.info("Starting office document processing", {
			bufferSize: buffer.length,
			strategy: "office",
		});

		// Parse office document using officeparser
		const { parseOfficeAsync } = await import("officeparser");
		const extractedText = await parseOfficeAsync(buffer);

		if (!extractedText || extractedText.trim().length === 0) {
			throw new Error("No text content extracted from office document");
		}

		logger.info("Office document processing completed", {
			extractedTextLength: extractedText.length,
		});

		return createProcessingResult(
			"office",
			true,
			extractedText,
			"text-extraction"
		);
	} catch (error) {
		logger.error("Office document processing failed", {
			error: error instanceof Error ? error.message : String(error),
			bufferSize: buffer.length,
		});

		return createProcessingResult(
			"office",
			false,
			"",
			"text-extraction",
			error instanceof Error ? error.message : String(error)
		);
	}
};

// Supported MIME types for office documents (from config)
const SUPPORTED_OFFICE_TYPES =
	DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES.OFFICE.mimeTypes;

// Office Document Processing Strategy Implementation
export const OfficeStrategy: ProcessorStrategy = {
	name: "office",
	canProcess: createMimeTypeCanProcess(SUPPORTED_OFFICE_TYPES),
	process: process,
};
