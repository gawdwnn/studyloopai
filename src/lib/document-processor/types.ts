export interface DocumentProcessor {
	// Check if this processor can handle the given document type
	canProcess(buffer: Buffer, mimeType: string): boolean;

	// Process document and extract text content
	process(buffer: Buffer): Promise<ProcessingResult>;
}

export interface ProcessingResult {
	success: boolean;
	text: string;
	source: "text" | "pdf-parser" | "mistral-ocr" | "office-parser" | "cache";
	error?: string;
}

export type { UserPlan } from "../config/document-processing";
