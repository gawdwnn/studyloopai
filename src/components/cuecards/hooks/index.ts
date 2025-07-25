// Cuecard-specific hooks - colocated for better maintainability

// Clean, direct server action + react-query approach
export { useCuecardAvailability } from "./use-cuecard-availability";
export { useCuecardGeneration } from "./use-cuecard-generation";

// Re-export types for convenience
export type {
	UseCuecardAvailabilityOptions,
	CuecardAvailabilityStatus,
} from "./use-cuecard-availability";

export type {
	UseCuecardGenerationOptions,
	UseCuecardGenerationReturn,
} from "./use-cuecard-generation";
