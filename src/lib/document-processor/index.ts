// Main document processing integration

// Export types and functions
export {
	getDocumentLimits,
	getSupportedFileTypes,
	isSupportedDocumentType,
} from "../config/document-processing";
export { getDocumentProcessor } from "./processor-factory";
export type {
	DocumentProcessor,
	ProcessingResult,
} from "./types";
