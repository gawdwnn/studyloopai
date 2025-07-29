// Cuecard-specific types colocated for better maintainability
// Re-exports from store types for convenience

import type { CuecardConfig } from "@/stores/cuecard-session/types";
import type { SelectiveGenerationConfig } from "@/types/generation-types";

export type {
	CardResponse,
	CuecardConfig,
	CuecardFeedback,
	CuecardMode,
	CuecardSessionState,
	PracticeMode,
	SessionStatus,
} from "@/stores/cuecard-session/types";

// Re-exports from action types for convenience
export type {
	CuecardProgress,
	SessionSyncData,
	UserCuecard,
} from "@/lib/actions/cuecard";

// Component-specific types
export interface Course {
	id: string;
	name: string;
	description: string | null;
}

export interface CuecardSessionSetupProps {
	courses: Course[];
	onStartSession: (config: CuecardConfig) => void;
	onClose: () => void;
	showWeekSelectionError?: boolean;
	showGenerationProgress?: boolean;
	onTriggerGeneration?: (
		courseId: string,
		weekIds?: string[],
		generationConfig?: SelectiveGenerationConfig
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
