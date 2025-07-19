/**
 * Database type definitions using Drizzle ORM type inference
 * This file demonstrates the standard practice for typing Drizzle schemas
 */

import type {
	GenerationMetadata,
	ProcessingMetadata,
	conceptMaps,
	courseMaterials,
	courseWeeks,
	courses,
	cuecards,
	documentChunks,
	generationConfigs,
	goldenNotes,
	institutions,
	multipleChoiceQuestions,
	openQuestions,
	ownNotes,
	summaries,
	userPlans,
	userProgress,
	userPromptTemplates,
	users,
} from "@/db/schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Course types
export type Course = InferSelectModel<typeof courses>;
export type NewCourse = InferInsertModel<typeof courses>;

// Course week types
export type CourseWeek = InferSelectModel<typeof courseWeeks>;
export type NewCourseWeek = InferInsertModel<typeof courseWeeks>;

// Course material types
export type CourseMaterial = InferSelectModel<typeof courseMaterials>;
export type NewCourseMaterial = InferInsertModel<typeof courseMaterials>;

// Document chunk types
export type DocumentChunk = InferSelectModel<typeof documentChunks>;
export type NewDocumentChunk = InferInsertModel<typeof documentChunks>;

// Generation config types
export type GenerationConfig = InferSelectModel<typeof generationConfigs>;
export type NewGenerationConfig = InferInsertModel<typeof generationConfigs>;

// User prompt template types
export type UserPromptTemplate = InferSelectModel<typeof userPromptTemplates>;
export type NewUserPromptTemplate = InferInsertModel<
	typeof userPromptTemplates
>;

// Generated content types
export type Cuecard = InferSelectModel<typeof cuecards>;
export type NewCuecard = InferInsertModel<typeof cuecards>;

export type MCQ = InferSelectModel<typeof multipleChoiceQuestions>;
export type NewMCQ = InferInsertModel<typeof multipleChoiceQuestions>;

export type OpenQuestion = InferSelectModel<typeof openQuestions>;
export type NewOpenQuestion = InferInsertModel<typeof openQuestions>;

export type Summary = InferSelectModel<typeof summaries>;
export type NewSummary = InferInsertModel<typeof summaries>;

export type GoldenNote = InferSelectModel<typeof goldenNotes>;
export type NewGoldenNote = InferInsertModel<typeof goldenNotes>;

export type ConceptMap = InferSelectModel<typeof conceptMaps>;
export type NewConceptMap = InferInsertModel<typeof conceptMaps>;

// User-generated content types
export type OwnNote = InferSelectModel<typeof ownNotes>;
export type NewOwnNote = InferInsertModel<typeof ownNotes>;

// Progress and subscription types
export type UserProgress = InferSelectModel<typeof userProgress>;
export type NewUserProgress = InferInsertModel<typeof userProgress>;

export type UserPlan = InferSelectModel<typeof userPlans>;
export type NewUserPlan = InferInsertModel<typeof userPlans>;

// Institution types
export type Institution = InferSelectModel<typeof institutions>;
export type NewInstitution = InferInsertModel<typeof institutions>;

// Type guards for JSONB fields
export function isProcessingMetadata(
	value: unknown
): value is ProcessingMetadata {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const obj = value as Record<string, unknown>;
	return "status" in obj && typeof obj.status === "string";
}

export function isGenerationMetadata(
	value: unknown
): value is GenerationMetadata {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const obj = value as Record<string, unknown>;
	const validFeatureKeys = [
		"cuecards",
		"mcqs",
		"openQuestions",
		"summaries",
		"goldenNotes",
		"conceptMaps",
	];

	// Empty object is valid
	if (Object.keys(obj).length === 0) {
		return true;
	}

	// Check if any key is a valid feature key
	return Object.keys(obj).some((key) => validFeatureKeys.includes(key));
}

// Re-export types that are used in JSONB columns
export type { GenerationMetadata, ProcessingMetadata };

export type {
	ConceptMapsConfig,
	CuecardMode,
	CuecardsConfig,
	DifficultyLevel,
	FeatureType,
	FocusType,
	GenerationStatus,
	GenerationTemplate,
	GoldenNotesConfig,
	McqsConfig,
	OpenQuestionsConfig,
	SelectiveGenerationConfig,
	SummariesConfig,
} from "./generation-types";
