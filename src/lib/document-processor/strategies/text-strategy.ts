import { DOCUMENT_PROCESSING_CONFIG } from "@/lib/config/document-processing";
import type { ProcessingResult } from "../types";
import type { ProcessorStrategy } from "./base-strategy";
import {
	createMimeTypeCanProcess,
	createProcessingResult,
} from "./base-strategy";

/**
 * Text Document Processing Strategy
 * Handles plain text, markdown, and CSV files
 */
const process = async (buffer: Buffer): Promise<ProcessingResult> => {
	try {
		// Convert buffer to UTF-8 text
		const rawText = buffer.toString("utf8");

		if (!rawText || rawText.trim().length === 0) {
			throw new Error("No text content found in document");
		}

		return createProcessingResult({
			success: true,
			text: rawText,
			source: "text",
		});
	} catch (error) {
		return createProcessingResult({
			success: false,
			text: "",
			source: "text",
			error: error instanceof Error ? error.message : String(error),
		});
	}
};

export const TextStrategy: ProcessorStrategy = {
	name: "text",
	canProcess: createMimeTypeCanProcess(
		DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES.TEXT.mimeTypes
	),
	process: process,
};
