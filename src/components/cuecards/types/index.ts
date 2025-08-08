// Cuecard-specific types colocated for better maintainability
// Re-exports from store types for convenience

import type { SelectiveGenerationConfig } from "@/types/generation-types";
import type { CuecardConfig } from "../stores/types";

export type {
	CardResponse,
	CuecardConfig,
	CuecardFeedback,
	CuecardSessionState,
	SessionStatus,
} from "../stores/types";

// Re-exports from action types for convenience
export type { UserCuecard } from "@/lib/actions/cuecard";

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
	correct: number;
	incorrect: number;
	sessionTime: string;
	avgPerCard: string;
	weekInfo: string;
}
