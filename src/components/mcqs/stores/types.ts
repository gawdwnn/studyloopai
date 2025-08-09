// MCQ Session Store Types
// Focused on multiple choice question functionality with strong typing

import type { UserMCQ } from "@/lib/actions/mcq";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import type { TimerActions, TimerState } from "@/types/timer-types";

export type SessionStatus =
	| "idle"
	| "loading"
	| "active"
	| "paused"
	| "completed"
	| "failed"
	| "needs_generation"
	| "no_content_for_weeks"
	| "generating";

// MCQ-specific configuration - simplified to match cuecards
export interface McqConfig {
	courseId: string;
	weeks: string[];
}

export interface McqQuestion {
	id: string;
	question: string;
	options: string[];
	correctAnswer: string;
	explanation?: string;
	difficulty: "easy" | "medium" | "hard";
	source: string;
	week: string;
	topic?: string;
	timesSeen: number;
	timesCorrect: number;
	timesIncorrect: number;
	averageResponseTime: number;
}

export interface McqAnswer {
	questionId: string;
	selectedAnswer: string | null;
	isCorrect: boolean;
	timeSpent: number; // milliseconds
	confidenceLevel: number; // 1-5 scale
	timestamp: Date;
}

export interface McqProgress {
	currentIndex: number;
	totalQuestions: number;
	correctAnswers: number;
	incorrectAnswers: number;
	skippedQuestions: number;
	timeSpent: number; // milliseconds
	startedAt: Date;
	lastUpdated: Date;
	averageTimePerQuestion: number;
	answers: McqAnswer[];
	flaggedQuestions: string[]; // questions marked for review
}

// Performance analytics for MCQ sessions
export interface McqPerformance {
	accuracy: number; // percentage
	averageResponseTime: number; // milliseconds
	difficultyBreakdown: Record<
		"easy" | "medium" | "hard",
		{
			attempted: number;
			correct: number;
			accuracy: number;
		}
	>;
	topicBreakdown: Record<
		string,
		{
			attempted: number;
			correct: number;
			accuracy: number;
		}
	>;
	timeEfficiency: number; // questions per minute
	confidenceAccuracy: number; // correlation between confidence and correctness
	improvementTrend: number; // accuracy trend over time
}

// Session state for MCQ sessions
export interface McqSessionState extends TimerState {
	id: string;
	status: SessionStatus;
	config: McqConfig;
	questions: McqQuestion[];
	progress: McqProgress;
	performance: McqPerformance;
	currentQuestion: McqQuestion | null;
	error: string | null;
	isLoading: boolean;
	lastSyncedAt: Date | null;
	generationRunId?: string;
	generationToken?: string;
	learningSessionId?: string | null; // Track the database learning session ID for feedback navigation
	realTimeSessionId: string | null; // Track real-time database session ID
}

// Store actions interface
export interface McqSessionActions extends TimerActions {
	// Session lifecycle
	startSession: (config: McqConfig, preLoadedMCQs: UserMCQ[]) => Promise<void>;
	endSession: () => Promise<string | null>;
	resetSession: () => void;

	// Answer submission
	submitAnswer: (
		questionId: string,
		selectedAnswer: string | null,
		timeSpent?: number, // Optional - timer will provide it
		confidenceLevel?: number
	) => Promise<void>;

	// Question skip
	skipQuestion: (
		questionId: string,
		timeSpent?: number // Optional - timer will provide it
	) => Promise<void>;

	// Generation support
	triggerGeneration: (
		courseId: string,
		weekIds: string[],
		generationConfig: SelectiveGenerationConfig
	) => Promise<{
		success: boolean;
		runId?: string;
		publicAccessToken?: string;
		error?: string;
	}>;
	resetGenerationState: () => void;
}

// Complete store interface
export interface McqSessionStore extends McqSessionState {
	actions: McqSessionActions;
}

// Initial state
export const initialMcqProgress: McqProgress = {
	currentIndex: 0,
	totalQuestions: 0,
	correctAnswers: 0,
	incorrectAnswers: 0,
	skippedQuestions: 0,
	timeSpent: 0,
	startedAt: new Date(),
	lastUpdated: new Date(),
	averageTimePerQuestion: 0,
	answers: [],
	flaggedQuestions: [],
};

export const initialMcqPerformance: McqPerformance = {
	accuracy: 0,
	averageResponseTime: 0,
	difficultyBreakdown: {
		easy: { attempted: 0, correct: 0, accuracy: 0 },
		medium: { attempted: 0, correct: 0, accuracy: 0 },
		hard: { attempted: 0, correct: 0, accuracy: 0 },
	},
	topicBreakdown: {},
	timeEfficiency: 0,
	confidenceAccuracy: 0,
	improvementTrend: 0,
};

export const initialMcqState: McqSessionState = {
	id: "",
	status: "idle",
	config: {
		courseId: "",
		weeks: [],
	},
	questions: [],
	progress: initialMcqProgress,
	performance: initialMcqPerformance,
	currentQuestion: null,
	error: null,
	isLoading: false,
	lastSyncedAt: null,
	learningSessionId: null,
	realTimeSessionId: null,
	// Timer state properties
	sessionElapsedTime: 0, // milliseconds
	sessionStartTime: null,
	isTimerRunning: false,
	isTimerPaused: false,
	itemElapsedTime: 0, // milliseconds
	itemStartTime: null,
	averageItemTime: 0, // milliseconds
	completedItemsCount: 0,
	totalItemTime: 0,
};
