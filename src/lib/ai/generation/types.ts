import type { SupportedContentType } from "../prompts";

export interface ContentGenerationResult {
	success: boolean;
	contentType: SupportedContentType;
	generatedCount: number;
	error?: string;
}

export interface AggregateGenerationResult {
	success: boolean;
	materialId: string;
	results: ContentGenerationResult[];
	totalGenerated: number;
	errors: string[];
}
