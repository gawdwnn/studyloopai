// Main document processing integration
import { DOCUMENT_PROCESSING_CONFIG } from "../config/document-processing";

// Export types and functions
export {
	getDocumentLimits,
	getSupportedFileTypes,
} from "../config/document-processing";
export { getDocumentProcessor } from "./processor-factory";
export type {
	DocumentProcessor,
	ProcessingMetadata,
	ProcessingOptions,
	ProcessingResult,
} from "./types";

// Utility function to check if a document type is supported
export function isSupportedDocumentType(mimeType: string): boolean {
	// Align with single source of truth in configuration
	const allMimeTypes: string[] = Object.values(
		DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES
	).flatMap((t) => t.mimeTypes as unknown as string[]);
	return allMimeTypes.includes(mimeType);
}
