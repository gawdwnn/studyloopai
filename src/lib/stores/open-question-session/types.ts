// Open Question Session Store Types
// Focused on open-ended question functionality with strong typing

export type DifficultyLevel = "easy" | "medium" | "hard" | "mixed";

export type FocusType = "tailored-for-me" | "weak-areas" | "recent-content" | "comprehensive";

export type SessionStatus = "idle" | "active" | "paused" | "completed" | "failed";

export type PracticeMode = "practice" | "exam";

export type EvaluationStatus = "pending" | "evaluating" | "completed" | "failed";

// Open question-specific configuration
export interface OpenQuestionConfig {
	courseId: string;
	weeks: string[]; // week IDs, empty array means all weeks
	numQuestions: number;
	difficulty: DifficultyLevel;
	focus: FocusType;
	practiceMode: PracticeMode;
	timeLimit?: number; // optional time limit in minutes for exam mode
	requireMinWords?: number; // minimum word count for answers
	enableAiEvaluation?: boolean; // whether to use AI for answer evaluation
}

// Open question with all necessary data
export interface OpenQuestion {
	id: string;
	question: string;
	sampleAnswer: string;
	difficulty: "easy" | "medium" | "hard";
	source: string;
	week: string;
	topic?: string;
	keywords?: string[]; // key concepts that should be mentioned
	timesSeen: number;
	timesAnswered: number;
	averageScore: number; // 0-1 scale
	averageWordCount: number;
	averageResponseTime: number;
}

// User's answer to an open question
export interface OpenQuestionAnswer {
	questionId: string;
	userAnswer: string;
	wordCount: number;
	timeSpent: number; // milliseconds
	timestamp: Date;

	// Evaluation metrics
	evaluationStatus: EvaluationStatus;
	aiScore?: number; // 0-1 scale from AI evaluation
	humanScore?: number; // 0-1 scale from human evaluation
	keywordMatches?: string[]; // keywords found in the answer
	feedback?: string; // AI or human feedback
	improvementSuggestions?: string[];
}

// Progress tracking specific to open question sessions
export interface OpenQuestionProgress {
	currentIndex: number;
	totalQuestions: number;
	answeredQuestions: number;
	skippedQuestions: number;
	timeSpent: number; // milliseconds
	startedAt: Date;
	lastUpdated: Date;

	// Open question-specific metrics
	averageTimePerQuestion: number;
	averageWordCount: number;
	averageScore: number; // based on evaluations
	answers: OpenQuestionAnswer[];
	flaggedQuestions: string[]; // questions marked for review
	remainingTime?: number; // for timed sessions
}

// Performance analytics for open question sessions
export interface OpenQuestionPerformance {
	overallScore: number; // average score across all answers
	averageResponseTime: number; // milliseconds
	averageWordCount: number;
	wordCountTrend: number; // how word count changes over time
	scoreTrend: number; // how scores improve over time

	difficultyBreakdown: Record<
		"easy" | "medium" | "hard",
		{
			attempted: number;
			averageScore: number;
			averageWordCount: number;
		}
	>;

	topicBreakdown: Record<
		string,
		{
			attempted: number;
			averageScore: number;
			keyStrengths: string[];
			improvementAreas: string[];
		}
	>;

	writingMetrics: {
		vocabularyDiversity: number; // unique words / total words
		averageSentenceLength: number;
		keywordUsage: number; // percentage of expected keywords used
		clarity: number; // AI assessment of answer clarity
	};

	timeEfficiency: number; // questions per minute
	consistencyScore: number; // how consistent performance is across questions
}

// Session state for open question sessions
export interface OpenQuestionSessionState {
	id: string;
	status: SessionStatus;
	config: OpenQuestionConfig;
	questions: OpenQuestion[];
	progress: OpenQuestionProgress;
	performance: OpenQuestionPerformance;
	currentQuestion: OpenQuestion | null;
	currentAnswer: string; // draft answer being typed
	error: string | null;
	isLoading: boolean;
	isEvaluating: boolean;
	lastSyncedAt: Date | null;
}

// Store actions interface
export interface OpenQuestionSessionActions {
	// Session lifecycle
	startSession: (config: OpenQuestionConfig) => Promise<void>;
	pauseSession: () => void;
	resumeSession: () => void;
	endSession: () => Promise<void>;
	resetSession: () => void;

	// Question management
	getCurrentQuestion: () => OpenQuestion | null;
	moveToNextQuestion: () => void;
	moveToPreviousQuestion: () => void;
	jumpToQuestion: (index: number) => void;
	flagQuestion: (questionId: string) => void;
	unflagQuestion: (questionId: string) => void;

	// Answer management
	updateCurrentAnswer: (answer: string) => void;
	submitAnswer: (questionId: string, answer: string, timeSpent: number) => Promise<void>;
	editAnswer: (questionId: string, newAnswer: string) => Promise<void>;
	skipQuestion: () => void;

	// Evaluation
	getEvaluationFeedback: (questionId: string) => OpenQuestionAnswer | null;

	// Progress tracking
	calculateProgress: () => OpenQuestionProgress;
	calculatePerformance: () => OpenQuestionPerformance;
	getSessionStats: () => {
		totalTime: number;
		questionsAnswered: number;
		averageScore: number;
		questionsRemaining: number;
		averageWordCount: number;
	};

	// Review and navigation
	getAnsweredQuestions: () => OpenQuestionAnswer[];
	getUnansweredQuestions: () => OpenQuestion[];
	getFlaggedQuestions: () => OpenQuestion[];
	getLowScoringAnswers: (threshold?: number) => OpenQuestionAnswer[];

	// Error handling
	setError: (error: string | null) => void;
	clearError: () => void;
}

// Complete store interface
export interface OpenQuestionSessionStore extends OpenQuestionSessionState {
	actions: OpenQuestionSessionActions;
}

// Initial state
export const initialOpenQuestionProgress: OpenQuestionProgress = {
	currentIndex: 0,
	totalQuestions: 0,
	answeredQuestions: 0,
	skippedQuestions: 0,
	timeSpent: 0,
	startedAt: new Date(),
	lastUpdated: new Date(),
	averageTimePerQuestion: 0,
	averageWordCount: 0,
	averageScore: 0,
	answers: [],
	flaggedQuestions: [],
};

export const initialOpenQuestionPerformance: OpenQuestionPerformance = {
	overallScore: 0,
	averageResponseTime: 0,
	averageWordCount: 0,
	wordCountTrend: 0,
	scoreTrend: 0,
	difficultyBreakdown: {
		easy: { attempted: 0, averageScore: 0, averageWordCount: 0 },
		medium: { attempted: 0, averageScore: 0, averageWordCount: 0 },
		hard: { attempted: 0, averageScore: 0, averageWordCount: 0 },
	},
	topicBreakdown: {},
	writingMetrics: {
		vocabularyDiversity: 0,
		averageSentenceLength: 0,
		keywordUsage: 0,
		clarity: 0,
	},
	timeEfficiency: 0,
	consistencyScore: 0,
};

export const initialOpenQuestionState: OpenQuestionSessionState = {
	id: "",
	status: "idle",
	config: {
		courseId: "",
		weeks: [],
		numQuestions: 5,
		difficulty: "mixed",
		focus: "comprehensive",
		practiceMode: "practice",
		requireMinWords: 50,
		enableAiEvaluation: true,
	},
	questions: [],
	progress: initialOpenQuestionProgress,
	performance: initialOpenQuestionPerformance,
	currentQuestion: null,
	currentAnswer: "",
	error: null,
	isLoading: false,
	isEvaluating: false,
	lastSyncedAt: null,
};
