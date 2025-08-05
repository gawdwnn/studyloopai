/**
 * Core types for the functional AI content generation architecture
 */

import type {
	ConceptMapsConfig,
	CuecardsConfig,
	GoldenNotesConfig,
	McqsConfig,
	OpenQuestionsConfig,
	SummariesConfig,
} from "@/types/generation-types";
import type { z } from "zod";

// Supported content types
export const SUPPORTED_CONTENT_TYPES = [
	"goldenNotes",
	"cuecards",
	"multipleChoice",
	"openQuestions",
	"summaries",
	"conceptMaps",
] as const;

export type SupportedContentType = (typeof SUPPORTED_CONTENT_TYPES)[number];

// Configuration mapping for type safety
export interface ConfigMap {
	goldenNotes: GoldenNotesConfig;
	cuecards: CuecardsConfig;
	multipleChoice: McqsConfig;
	openQuestions: OpenQuestionsConfig;
	summaries: SummariesConfig;
	conceptMaps: ConceptMapsConfig;
}

import type { ConceptMap } from "../schemas/concept-maps";
import type { Cuecard } from "../schemas/cuecards";
// Import output types from schemas
import type { GoldenNote } from "../schemas/golden-notes";
import type { MCQ } from "../schemas/mcq";
import type { OpenQuestion } from "../schemas/open-questions";
import type { Summary } from "../schemas/summaries";

// Output type mapping
export interface OutputMap {
	goldenNotes: GoldenNote;
	cuecards: Cuecard;
	multipleChoice: MCQ;
	openQuestions: OpenQuestion;
	summaries: Summary;
	conceptMaps: ConceptMap;
}

// Content generation prompt interface
export interface ContentGenerationPrompt {
	systemPrompt: string;
	userPrompt: (context: Record<string, unknown>) => string;
}

// Generation request interface with type safety
export interface GenerationRequest<T extends SupportedContentType> {
	contentType: T;
	courseId: string;
	weekId: string;
	materialIds: string[];
	config: ConfigMap[T];
	cacheKey?: string;
	options?: GenerationOptions;
}

// Generation options
export interface GenerationOptions {
	maxTokens?: number;
	temperature?: number;
}

// Generation result interface
export interface GenerationResult {
	success: boolean;
	contentType: SupportedContentType;
	generatedCount: number;
	error?: string;
	metadata?: Record<string, unknown>;
}

// Content chunks interface
export interface ContentChunks {
	content: string;
	chunks: string[];
	metadata?: {
		cacheHit?: boolean;
		chunkCount: number;
		source: "cache" | "database";
	};
}

// Chunk retrieval request
export interface ChunkRetrievalRequest {
	materialIds: string[];
	cacheKey?: string;
	courseId: string;
	weekId: string;
	contentType: SupportedContentType;
}

// Content strategy interface - functional approach
export interface ContentStrategy<TConfig, TOutput> {
	readonly contentType: SupportedContentType;
	readonly responseType: "object";
	buildContext: (content: string, config: TConfig) => Record<string, unknown>;
	getPrompt: () => ContentGenerationPrompt;
	getSchema: () => z.ZodObject<z.ZodRawShape>;
	extractArrayFromObject: (obj: unknown) => TOutput[];
	persist: (data: TOutput[], courseId: string, weekId: string) => Promise<void>;
}

// AI generation context
export interface AIGenerationContext {
	content: string;
	difficulty: "beginner" | "intermediate" | "advanced";
	count?: number;
	focus?: "conceptual" | "practical" | "mixed";
	style?: string;
	language?: string;
}
