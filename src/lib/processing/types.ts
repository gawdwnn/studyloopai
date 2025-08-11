export interface DocumentProcessor {
	// Check if this processor can handle the given document type
	canProcess(buffer: Buffer, mimeType: string): boolean;

	// Process document and extract text content
	process(
		buffer: Buffer,
		options: ProcessingOptions
	): Promise<ProcessingResult>;
}

export interface ProcessingOptions {
	materialId: string;
}

export interface ProcessingResult {
	success: boolean;
	text: string;
	metadata: ProcessingMetadata;
	error?: string;
}

export interface ProcessingMetadata {
	processor: string;
	source: "text-extraction" | "ocr" | "cache";
	confidence?: number;
	pageCount?: number;
	warnings?: string[];
}

export interface OCRResult {
	text: string;
	metadata: {
		provider: string;
		model: string;
		usage?: any;
		finishReason?: string;
	};
}

export interface OCROptions {
	maxRetries?: number;
	maxOutputTokens?: number;
	preferredModel?: string;
}

export type UserPlan = "free" | "monthly" | "yearly";
export type Environment = "development" | "production";
