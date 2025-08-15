import { DOCUMENT_PROCESSING_CONFIG } from "@/lib/config/document-processing";
import type { ProcessingResult } from "../types";
import {
	type ProcessorStrategy,
	createMimeTypeCanProcess,
	createProcessingResult,
} from "./base-strategy";

const process = async (buffer: Buffer): Promise<ProcessingResult> => {
	try {
		// Dynamic import to avoid evaluating browser-dependent code at build time
		const { extractText } = await import("unpdf");
		// unpdf expects Uint8Array rather than Node Buffer
		const uint8 = new Uint8Array(
			buffer.buffer,
			buffer.byteOffset,
			buffer.byteLength
		);
		const result = await extractText(uint8);
		// Handle both string and array responses from unpdf
		const text = Array.isArray(result)
			? result.join(" ")
			: typeof result === "string"
				? result
				: String(result);

		if (text.trim().length === 0) {
			throw new Error("No text extracted from PDF");
		}

		return createProcessingResult({
			success: true,
			text,
			source: "pdf-parser",
		});
	} catch (error) {
		return createProcessingResult({
			success: false,
			text: "",
			source: "pdf-parser",
			error: error instanceof Error ? error.message : String(error),
		});
	}
};

// Export the PDF strategy
export const PDFStrategy: ProcessorStrategy = {
	name: "pdf-parser",
	canProcess: createMimeTypeCanProcess(
		DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES.PDF.mimeTypes
	),
	process: process,
};
