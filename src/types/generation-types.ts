// Types for selective generation system

export type FeatureType =
	| "cuecards"
	| "mcqs"
	| "openQuestions"
	| "summaries"
	| "goldenNotes"
	| "conceptMaps";

// Feature status for week availability
export interface FeatureStatus {
	generated: boolean;
	count: number;
	generatedAt: Date | null;
}

// Week feature availability mapping
export interface FeatureAvailability {
	cuecards: FeatureStatus;
	mcqs: FeatureStatus;
	openQuestions: FeatureStatus;
	summaries: FeatureStatus;
	goldenNotes: FeatureStatus;
	conceptMaps: FeatureStatus;
}

export type GenerationStatus =
	| "not_requested"
	| "pending"
	| "in_progress"
	| "completed"
	| "failed";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export type FocusType = "conceptual" | "practical" | "mixed";

export type CuecardMode = "definition" | "application" | "comprehensive";

// Base config
interface BaseConfig {
	count: number;
	difficulty: DifficultyLevel;
	focus: FocusType;
}

// Feature-specific configuration interfaces
export type CuecardsConfig = BaseConfig & {
	mode: CuecardMode;
};

export type McqsConfig = BaseConfig;

export type OpenQuestionsConfig = BaseConfig;

export type SummariesConfig = BaseConfig & {
	length: "short" | "medium" | "long";
};

export type GoldenNotesConfig = BaseConfig;

// ConceptMapsConfig doesn't extend BaseConfig since it has no count
export type ConceptMapsConfig = {
	difficulty: DifficultyLevel;
	focus: FocusType;
	style: "hierarchical" | "radial" | "network";
};

// Selective generation configuration
export interface SelectiveGenerationConfig {
	selectedFeatures: {
		cuecards?: boolean;
		mcqs?: boolean;
		openQuestions?: boolean;
		summaries?: boolean;
		goldenNotes?: boolean;
		conceptMaps?: boolean;
	};
	featureConfigs: {
		cuecards?: CuecardsConfig;
		mcqs?: McqsConfig;
		openQuestions?: OpenQuestionsConfig;
		summaries?: SummariesConfig;
		goldenNotes?: GoldenNotesConfig;
		conceptMaps?: ConceptMapsConfig;
	};
}

// User generation template
export interface GenerationTemplate {
	id: string;
	userId: string;
	name: string;
	featureType: FeatureType;
	config:
		| CuecardsConfig
		| McqsConfig
		| OpenQuestionsConfig
		| SummariesConfig
		| GoldenNotesConfig
		| ConceptMapsConfig;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
}

// Content availability status for session setup
export interface ContentAvailabilityStatus {
	courseId: string;
	weekId?: string;
	availableFeatures: {
		cuecards: boolean;
		mcqs: boolean;
		openQuestions: boolean;
		summaries: boolean;
		goldenNotes: boolean;
		conceptMaps: boolean;
	};
	generatingFeatures: {
		cuecards: boolean;
		mcqs: boolean;
		openQuestions: boolean;
		summaries: boolean;
		goldenNotes: boolean;
		conceptMaps: boolean;
	};
}

// Default config generators - type-safe
export function getDefaultCuecardsConfig(): CuecardsConfig {
	return {
		count: 10,
		difficulty: "intermediate",
		focus: "conceptual",
		mode: "comprehensive",
	};
}

export function getDefaultMcqsConfig(): McqsConfig {
	return {
		count: 10,
		difficulty: "intermediate",
		focus: "conceptual",
	};
}

export function getDefaultOpenQuestionsConfig(): OpenQuestionsConfig {
	return {
		count: 5,
		difficulty: "intermediate",
		focus: "conceptual",
	};
}

export function getDefaultSummariesConfig(): SummariesConfig {
	return {
		count: 1,
		difficulty: "intermediate",
		focus: "conceptual",
		length: "medium",
	};
}

export function getDefaultGoldenNotesConfig(): GoldenNotesConfig {
	return {
		count: 5,
		difficulty: "intermediate",
		focus: "conceptual",
	};
}

export function getDefaultConceptMapsConfig(): ConceptMapsConfig {
	return {
		difficulty: "intermediate",
		focus: "conceptual",
		style: "hierarchical",
	};
}

// Define a type map for feature configs
type FeatureConfigMap = {
	cuecards: CuecardsConfig;
	mcqs: McqsConfig;
	openQuestions: OpenQuestionsConfig;
	summaries: SummariesConfig;
	goldenNotes: GoldenNotesConfig;
	conceptMaps: ConceptMapsConfig;
};

// Type-safe function using generics and type inference
export function getDefaultConfigForFeature<T extends FeatureType>(
	feature: T
): FeatureConfigMap[T] {
	const configMap: { [K in FeatureType]: () => FeatureConfigMap[K] } = {
		cuecards: getDefaultCuecardsConfig,
		mcqs: getDefaultMcqsConfig,
		openQuestions: getDefaultOpenQuestionsConfig,
		summaries: getDefaultSummariesConfig,
		goldenNotes: getDefaultGoldenNotesConfig,
		conceptMaps: getDefaultConceptMapsConfig,
	};

	return configMap[feature]();
}
