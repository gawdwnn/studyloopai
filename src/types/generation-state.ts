/**
 * Generation State Machine Types
 * Tracks the lifecycle of content generation for course week features
 */

export enum GenerationState {
	NOT_STARTED = "not_started",
	QUEUED = "queued",
	PROCESSING = "processing",
	PARTIAL_SUCCESS = "partial_success",
	COMPLETED = "completed",
	FAILED = "failed",
	RETRY_SCHEDULED = "retry_scheduled",
}

export interface GenerationStateHistoryEntry {
	state: GenerationState;
	timestamp: string;
	feature?: string;
	migrated?: boolean;
	error?: string;
	details?: Record<string, unknown>;
}

export interface FeatureGenerationStatus {
	generated: boolean;
	count: number;
	generatedAt: Date | null;
	state: GenerationState;
	retryCount: number;
}

export interface CourseWeekFeatureStatus {
	cuecards: FeatureGenerationStatus;
	mcqs: FeatureGenerationStatus;
	openQuestions: FeatureGenerationStatus;
	summaries: FeatureGenerationStatus;
	goldenNotes: FeatureGenerationStatus;
	conceptMaps: FeatureGenerationStatus;
	overallState: GenerationState;
	lastError?: Record<string, unknown>;
}

export interface CourseFeatureAvailability {
	[weekId: string]: CourseWeekFeatureStatus;
}

/**
 * State transition validation
 */
export const VALID_STATE_TRANSITIONS: Record<
	GenerationState,
	GenerationState[]
> = {
	[GenerationState.NOT_STARTED]: [GenerationState.QUEUED],
	[GenerationState.QUEUED]: [
		GenerationState.PROCESSING,
		GenerationState.FAILED,
	],
	[GenerationState.PROCESSING]: [
		GenerationState.COMPLETED,
		GenerationState.PARTIAL_SUCCESS,
		GenerationState.FAILED,
	],
	[GenerationState.PARTIAL_SUCCESS]: [
		GenerationState.QUEUED,
		GenerationState.COMPLETED,
		GenerationState.FAILED,
	],
	[GenerationState.COMPLETED]: [], // Terminal state
	[GenerationState.FAILED]: [GenerationState.RETRY_SCHEDULED],
	[GenerationState.RETRY_SCHEDULED]: [
		GenerationState.QUEUED,
		GenerationState.FAILED,
	],
};

export function isValidStateTransition(
	from: GenerationState,
	to: GenerationState
): boolean {
	return VALID_STATE_TRANSITIONS[from].includes(to);
}

export function getStateColor(state: GenerationState): string {
	switch (state) {
		case GenerationState.NOT_STARTED:
			return "text-gray-500";
		case GenerationState.QUEUED:
			return "text-blue-500";
		case GenerationState.PROCESSING:
			return "text-yellow-500";
		case GenerationState.PARTIAL_SUCCESS:
			return "text-orange-500";
		case GenerationState.COMPLETED:
			return "text-green-500";
		case GenerationState.FAILED:
			return "text-red-500";
		case GenerationState.RETRY_SCHEDULED:
			return "text-purple-500";
		default:
			return "text-gray-500";
	}
}

export function getStateLabel(state: GenerationState): string {
	switch (state) {
		case GenerationState.NOT_STARTED:
			return "Not Started";
		case GenerationState.QUEUED:
			return "Queued";
		case GenerationState.PROCESSING:
			return "Processing";
		case GenerationState.PARTIAL_SUCCESS:
			return "Partial Success";
		case GenerationState.COMPLETED:
			return "Completed";
		case GenerationState.FAILED:
			return "Failed";
		case GenerationState.RETRY_SCHEDULED:
			return "Retry Scheduled";
		default:
			return "Unknown";
	}
}
