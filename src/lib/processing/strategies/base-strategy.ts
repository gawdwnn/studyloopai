import type { ProcessingOptions, ProcessingResult } from "../types";

// Functional strategy configuration
export interface ProcessorStrategy {
	name: string;
	canProcess: (buffer: Buffer, mimeType: string) => boolean;
	process: (
		buffer: Buffer,
		options: ProcessingOptions
	) => Promise<ProcessingResult>;
}

// Helper functions for common strategy operations
export const createProcessingResult = (
	strategyName: string,
	success: boolean,
	text: string,
	source: "text-extraction" | "ocr" | "cache" = "text-extraction",
	error?: string,
	warnings?: string[],
	confidence?: number
): ProcessingResult => {
	return {
		success,
		text,
		error,
		metadata: {
			processor: strategyName,
			source,
			confidence,
			warnings,
		},
	};
};

// Helper function to validate MIME type
export const validateMimeType = (
	mimeType: string,
	supportedTypes: string[]
): boolean => {
	return supportedTypes.some((type) => mimeType.includes(type));
};

// Factory to create a MIME-only canProcess function for strategies
export const createMimeTypeCanProcess = (supportedTypes: readonly string[]) => {
	return (_buffer: Buffer, mimeType: string): boolean =>
		validateMimeType(mimeType, supportedTypes as string[]);
};
