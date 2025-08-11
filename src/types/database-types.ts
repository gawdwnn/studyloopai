/**
 * Database type definitions using Drizzle ORM type inference
 */

import type {
	aiRecommendations,
	conceptMappings,
	conceptMaps,
	courseMaterials,
	courseWeekFeatures,
	courseWeeks,
	courses,
	cuecardScheduling,
	cuecards,
	documentChunks,
	goldenNotes,
	learningGaps,
	learningSessions,
	multipleChoiceQuestions,
	openQuestions,
	ownNotes,
	sessionResponses,
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

// Course week features types
export type CourseWeekFeatures = InferSelectModel<typeof courseWeekFeatures>;
export type NewCourseWeekFeatures = InferInsertModel<typeof courseWeekFeatures>;

// Course material types
export type CourseMaterial = InferSelectModel<typeof courseMaterials>;
export type NewCourseMaterial = InferInsertModel<typeof courseMaterials>;

// Document chunk types
export type DocumentChunk = InferSelectModel<typeof documentChunks>;
export type NewDocumentChunk = InferInsertModel<typeof documentChunks>;

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

// Adaptive Learning types
export type LearningSession = InferSelectModel<typeof learningSessions>;
export type NewLearningSession = InferInsertModel<typeof learningSessions>;

export type SessionResponse = InferSelectModel<typeof sessionResponses>;
export type NewSessionResponse = InferInsertModel<typeof sessionResponses>;

export type LearningGap = InferSelectModel<typeof learningGaps>;
export type NewLearningGap = InferInsertModel<typeof learningGaps>;

export type CuecardScheduling = InferSelectModel<typeof cuecardScheduling>;
export type NewCuecardScheduling = InferInsertModel<typeof cuecardScheduling>;

export type ConceptMapping = InferSelectModel<typeof conceptMappings>;
export type NewConceptMapping = InferInsertModel<typeof conceptMappings>;

export type AiRecommendation = InferSelectModel<typeof aiRecommendations>;
export type NewAiRecommendation = InferInsertModel<typeof aiRecommendations>;

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
