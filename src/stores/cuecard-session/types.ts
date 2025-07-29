// Cuecard Session Store Types

import type { UserCuecard } from "@/lib/actions/cuecard";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import type { BaseSessionConfig } from "../session-manager/types";

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

// Cuecard-specific configuration for an active session
export interface CuecardConfig extends BaseSessionConfig {
	// Simplified configuration for binary feedback system
}

// Configuration used on the setup screen
export interface CuecardSetupConfig {
	courseId: string;
	week: string;
}

// Simple card response tracking
export interface CardResponse {
	cardId: string;
	feedback: CuecardFeedback;
	timeSpent: number;
	attemptedAt: Date;
}

// Simplified session state
export interface CuecardSessionState {
	id: string;
	status: SessionStatus;
	config: CuecardConfig; // Config for the active session
	setupConfig: CuecardSetupConfig; // Config for the setup screen

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

// Simplified store actions
export interface CuecardSessionActions {
	// Session lifecycle
	startSessionWithData: (
		config: CuecardConfig,
		preLoadedCards: UserCuecard[]
	) => Promise<void>;
	endSession: () => Promise<void>;
	resetSession: () => void;

	// Setup configuration
	setSetupConfig: (config: Partial<CuecardSetupConfig>) => void;
	initSetupConfig: (
		courses: { id: string }[],
		initialParams: Partial<CuecardSetupConfig>
	) => void;

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

	// Error handling
	setError: (error: string | null) => void;

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
	setupConfig: {
		courseId: "",
		week: "all-weeks",
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
};
