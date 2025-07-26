import type { SessionStatus } from "@/stores/cuecard-session/types";

export const SETUP_STATES: readonly SessionStatus[] = [
	"idle",
	"failed",
	"needs_generation",
	"no_content_for_weeks",
	"generating",
] as const;

export function isSetupState(status: SessionStatus): boolean {
	return SETUP_STATES.includes(status);
}

export function isActiveState(status: SessionStatus): boolean {
	return status === "active";
}

export function isCompletedState(status: SessionStatus): boolean {
	return status === "completed";
}

export function isLoadingState(status: SessionStatus): boolean {
	return status === "loading" || status === "generating";
}

export function isErrorState(status: SessionStatus): boolean {
	return status === "failed";
}

/**
 * Check if there's no content available for selected weeks
 */
export function hasNoContentForWeeks(status: SessionStatus): boolean {
	return status === "no_content_for_weeks";
}

/**
 * Check if content is currently being generated
 */
export function isGenerating(status: SessionStatus): boolean {
	return status === "generating";
}
