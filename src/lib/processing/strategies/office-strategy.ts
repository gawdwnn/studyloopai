import { DOCUMENT_PROCESSING_CONFIG } from "@/lib/config/document-processing";
import type { ProcessingResult } from "../types";
import type { ProcessorStrategy } from "./base-strategy";
import {
	createMimeTypeCanProcess,
	createProcessingResult,
} from "./base-strategy";

/**
 * Office Document Processing Strategy
 * Handles Word, Excel, PowerPoint, and other Office formats
 */
const process = async (buffer: Buffer): Promise<ProcessingResult> => {
	try {
		// Parse office document using officeparser
		const officeParserModule = await import("officeparser");
		const parseOfficeAsync =
			officeParserModule.parseOfficeAsync ||
			officeParserModule.default?.parseOfficeAsync;

		const text = await parseOfficeAsync(buffer);

		if (!text || text.trim().length === 0) {
			throw new Error("No text content extracted from office document");
		}

		return createProcessingResult({
			success: true,
			text,
			source: "office-parser",
		});
	} catch (error) {
		return createProcessingResult({
			success: false,
			text: "",
			source: "office-parser",
			error: error instanceof Error ? error.message : String(error),
		});
	}
};

export const OfficeStrategy: ProcessorStrategy = {
	name: "office-parser",
	canProcess: createMimeTypeCanProcess(
		DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES.OFFICE.mimeTypes
	),
	process: process,
};
