import { DOCUMENT_PROCESSING_CONFIG } from "@/lib/config/document-processing";
import { logger } from "@/lib/utils/logger";
import type { ProcessingOptions, ProcessingResult } from "../types";
import {
	type ProcessorStrategy,
	createMimeTypeCanProcess,
	createProcessingResult,
} from "./base-strategy";

// Supported MIME types for PDF processing (from config)
const SUPPORTED_MIME_TYPES =
	DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES.PDF.mimeTypes;

// PDF processing functions
const extractWithUnpdf = async (
	buffer: Buffer
): Promise<{ success: boolean; text: string; error?: string }> => {
	try {
		// Dynamic import to avoid evaluating browser-dependent code at build time
		const { extractText } = await import("unpdf");
		const result = await extractText(buffer);
		// Handle both string and array responses from unpdf
		const text = Array.isArray(result)
			? result.join(" ")
			: typeof result === "string"
				? result
				: String(result);

		return {
			success: true,
			text,
		};
	} catch (error) {
		return {
			success: false,
			text: "",
			error: error instanceof Error ? error.message : "unpdf extraction failed",
		};
	}
};

// PDF processing strategy implementation
const process = async (
	buffer: Buffer,
	_options: ProcessingOptions
): Promise<ProcessingResult> => {
	const strategyName = "pdf-basic";

	try {
		// Use unpdf for PDF text extraction
		const result = await extractWithUnpdf(buffer);

		if (result.success && result.text.length > 0) {
			logger.info("PDF processing completed successfully", {
				method: "unpdf",
				textLength: result.text.length,
			});

			return createProcessingResult(
				strategyName,
				true,
				result.text,
				"text-extraction"
			);
		}

		// If unpdf fails or produces no text
		logger.error("PDF extraction failed", {
			error: result.error,
		});

		return createProcessingResult(
			strategyName,
			false,
			"",
			"text-extraction",
			result.error || "Could not extract text from PDF"
		);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown PDF processing error";

		logger.error("PDF processing failed with exception", {
			error: errorMessage,
		});

		return createProcessingResult(
			strategyName,
			false,
			"",
			"text-extraction",
			errorMessage
		);
	}
};

// Export the PDF strategy
export const PDFStrategy: ProcessorStrategy = {
	name: "pdf-basic",
	canProcess: createMimeTypeCanProcess(SUPPORTED_MIME_TYPES),
	process: process,
};
