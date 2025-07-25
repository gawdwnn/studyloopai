// Cuecard Session Store Types

import type { UserCuecard } from "@/lib/actions/cuecard";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import type { BaseSessionConfig } from "../session-manager/types";

export type CuecardFeedback = "too_easy" | "knew_some" | "incorrect";

export type CuecardMode = "both" | "term_first" | "definition_first";

export type PracticeMode = "practice" | "exam";

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
	mode: CuecardMode;
}

// Configuration used on the setup screen
export interface CuecardSetupConfig {
	courseId: string;
	week: string;
	mode: CuecardMode;
	practiceMode: PracticeMode;
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
	startTime: Date; // Track when session started
	cardStartTime: Date | null; // Track when current card was started

	// UI state
	error: string | null;
	isLoading: boolean;
}

// Session statistics for results display
export interface SessionStats {
	totalCards: number;
	tooEasy: number;
	knewSome: number;
	incorrect: number;
	totalTime: number;
	averageTimePerCard: number;
	accuracy: number;
}

// Simplified store actions
export interface CuecardSessionActions {
	// Session lifecycle
	startSession: (config: CuecardConfig) => Promise<void>;
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
		weekIds?: string[],
		generationConfig?: SelectiveGenerationConfig
	) => Promise<boolean>;

	// Error handling
	setError: (error: string | null) => void;
}

// Complete store interface
export interface CuecardSessionStore extends CuecardSessionState {
	actions: CuecardSessionActions;
}

// Initial state
export const initialCuecardState: CuecardSessionState = {
	id: "",
	status: "idle",
	config: {
		courseId: "",
		weeks: [],
		mode: "both",
		practiceMode: "practice",
	},
	setupConfig: {
		courseId: "",
		week: "all-weeks",
		mode: "both",
		practiceMode: "practice",
	},
	cards: [],
	currentIndex: 0,
	responses: [],
	startTime: new Date(),
	cardStartTime: null,
	error: null,
	isLoading: false,
};
