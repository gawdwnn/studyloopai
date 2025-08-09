// Cuecard Session Store Types

import type { UserCuecard } from "@/lib/actions/cuecard";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import type { TimerActions, TimerState } from "@/types/timer-types";

export type CuecardFeedback = "correct" | "incorrect";

export type SessionStatus =
	| "idle"
	| "active"
	| "completed"
	| "failed"
	| "needs_generation"
	| "no_content_for_weeks"
	| "loading"
	| "generating";

// Cuecard-specific configuration - simplified
export interface CuecardConfig {
	courseId: string;
	weeks: string[];
}

// Simple card response tracking
export interface CardResponse {
	cardId: string;
	feedback: CuecardFeedback;
	timeSpent: number;
	attemptedAt: Date;
}

// Simplified session state with timer functionality
export interface CuecardSessionState extends TimerState {
	id: string;
	status: SessionStatus;
	config: CuecardConfig;

	// Direct database mapping
	cards: UserCuecard[];

	// progress tracking
	currentIndex: number;
	responses: CardResponse[];
	startTime: Date | null; // Track when session started
	cardStartTime: Date | null; // Track when current card was started

	// UI state
	error: string | null;
	isLoading: boolean;

	// Generation tracking
	generationRunId?: string;
	generationToken?: string;

	// Session tracking for results and feedback navigation
	learningSessionId?: string | null;
	realTimeSessionId: string | null; // Track real-time database session ID
}

// Session statistics for results display
export interface SessionStats {
	totalCards: number;
	correct: number;
	incorrect: number;
	totalTime: number;
	averageTimePerCard: number;
	accuracy: number;
}

// Simplified store actions with timer functionality
export interface CuecardSessionActions extends TimerActions {
	// Session lifecycle
	startSession: (
		config: CuecardConfig,
		preLoadedCards: UserCuecard[]
	) => Promise<void>;
	endSession: () => Promise<string | null | undefined>;
	resetSession: () => void;

	// Card navigation
	getCurrentCard: () => UserCuecard | null;
	submitFeedback: (feedback: CuecardFeedback) => Promise<void>;

	// Content generation
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

	// Generation state management
	resetGenerationState: () => void;
}

// Progress tracking for session progress indicator
export interface CuecardProgress {
	correctAnswers: number;
	incorrectAnswers: number;
	currentIndex: number;
	totalCards: number;
	startedAt: Date | null;
}

// Complete store interface
export interface CuecardSessionStore extends CuecardSessionState {
	actions: CuecardSessionActions;
	// Computed property for session progress indicator
	progress: CuecardProgress;
}

// Initial state
export const initialCuecardState: CuecardSessionState = {
	id: "",
	status: "idle",
	config: {
		courseId: "",
		weeks: [],
	},
	cards: [],
	currentIndex: 0,
	responses: [],
	startTime: null,
	cardStartTime: null,
	error: null,
	isLoading: false,
	generationRunId: undefined,
	generationToken: undefined,
	learningSessionId: undefined,
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
