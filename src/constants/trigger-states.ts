/**
 * Trigger.dev status constants and task identifiers
 * Centralized to avoid hardcoded arrays scattered throughout components
 */

/** Trigger.dev run statuses that indicate failure */
export const TRIGGER_FAILURE_STATES = [
	"CRASHED",
	"CANCELED",
	"SYSTEM_FAILURE",
	"INTERRUPTED",
	"TIMED_OUT",
] as const;

/** Trigger.dev run statuses that indicate active processing */
export const TRIGGER_PROCESSING_STATES = [
	"EXECUTING",
	"QUEUED",
	"WAITING_FOR_DEPLOY",
] as const;

/** Content generation task identifiers for Phase 2 tracking */
export const CONTENT_GENERATION_TASKS = [
	"ai-content-orchestrator",
	"generate-summaries",
	"generate-golden-notes",
	"generate-cuecards",
	"generate-mcqs",
	"generate-open-questions",
	"generate-concept-maps",
] as const;

/** Type helpers for better type safety */
export type TriggerFailureState = (typeof TRIGGER_FAILURE_STATES)[number];
export type TriggerProcessingState = (typeof TRIGGER_PROCESSING_STATES)[number];
export type ContentGenerationTask = (typeof CONTENT_GENERATION_TASKS)[number];

/** Utility functions for status checking */
export const isFailureStatus = (
	status: string
): status is TriggerFailureState => {
	return TRIGGER_FAILURE_STATES.includes(status as TriggerFailureState);
};

export const isProcessingStatus = (
	status: string
): status is TriggerProcessingState => {
	return TRIGGER_PROCESSING_STATES.includes(status as TriggerProcessingState);
};

export const isContentGenerationTask = (
	taskId: string
): taskId is ContentGenerationTask => {
	return CONTENT_GENERATION_TASKS.includes(taskId as ContentGenerationTask);
};

export const isCompletedStatus = (status: string): boolean => {
	return status === "COMPLETED" || status.includes("COMPLETED");
};
