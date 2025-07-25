// Cuecard-specific types colocated for better maintainability
// Re-exports from store types for convenience

export type {
	CuecardFeedback,
	CuecardMode,
	PracticeMode,
	SessionStatus,
	CuecardConfig,
	CardResponse,
	CuecardSessionState,
} from "@/stores/cuecard-session/types";

// Re-exports from action types for convenience
export type {
	UserCuecard,
	CuecardProgress,
	SessionSyncData,
} from "@/lib/actions/cuecard";

// Component-specific types
export interface Course {
	id: string;
	name: string;
	description: string | null;
}

export interface CuecardSessionSetupProps {
	courses: Course[];
	onStartSession: (
		config: import("@/stores/cuecard-session/types").CuecardConfig
	) => void;
	onClose: () => void;
	showGenerationPrompt?: boolean;
	showWeekSelectionError?: boolean;
	showGenerationProgress?: boolean;
	onTriggerGeneration?: (
		courseId: string,
		weekIds?: string[],
		generationConfig?: import(
			"@/types/generation-types"
		).SelectiveGenerationConfig
	) => Promise<void>;
}

export interface CuecardSessionManagerProps {
	courses: Course[];
}

// Session results types
export interface SessionResults {
	totalCards: number;
	tooEasy: number;
	showAnswer: number;
	incorrect: number;
	sessionTime: string;
	avgPerCard: string;
	weekInfo: string;
}
