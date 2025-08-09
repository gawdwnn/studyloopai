import type {
	GenerationResult,
	GenerationState,
} from "@/lib/services/on-demand-generation-service";
import { triggerOnDemandGeneration } from "@/lib/services/on-demand-generation-service";
import type {
	FeatureType,
	SelectiveGenerationConfig,
} from "@/types/generation-types";
import { useCallback } from "react";

export interface UseOnDemandGenerationParams<T> {
	setState: (updates: Partial<T & GenerationState>) => void;
	featureType: FeatureType;
}

export interface UseOnDemandGenerationReturn {
	triggerGeneration: (
		courseId: string,
		weekIds: string[],
		generationConfig: SelectiveGenerationConfig
	) => Promise<GenerationResult>;
	resetGenerationState: () => void;
}

/**
 * Hook for on-demand content generation with shared state management.
 * Eliminates duplicate code between MCQ and cuecard stores.
 */
export function useOnDemandGeneration<T>({
	setState,
	featureType,
}: UseOnDemandGenerationParams<T>): UseOnDemandGenerationReturn {
	const triggerGeneration = useCallback(
		async (
			courseId: string,
			weekIds: string[],
			generationConfig: SelectiveGenerationConfig
		): Promise<GenerationResult> => {
			setState({
				isLoading: true,
				error: null,
				status: "generating",
			} as Partial<T & GenerationState>);

			const result = await triggerOnDemandGeneration({
				courseId,
				weekIds,
				generationConfig,
				featureType,
			});
			if (result.success) {
				setState({
					isLoading: false,
					status: "generating",
					error: null,
					generationRunId: result.runId,
					generationToken: result.publicAccessToken,
				} as Partial<T & GenerationState>);
			} else {
				setState({
					isLoading: false,
					error: "Failed to trigger generation",
					status: "failed",
				} as Partial<T & GenerationState>);
			}

			return result;
		},
		[setState, featureType]
	);

	const resetGenerationState = useCallback(() => {
		setState({
			status: "idle",
			error: null,
			generationRunId: undefined,
			generationToken: undefined,
		} as Partial<T & GenerationState>);
	}, [setState]);

	return {
		triggerGeneration,
		resetGenerationState,
	};
}

/**
 * Creates generation handlers for Zustand stores.
 * Provides the same interface as original store methods.
 */
export function createGenerationHandlers<T>(
	featureType: FeatureType,
	// biome-ignore lint/suspicious/noExplicitAny: Zustand set function signature
	set: (updater: any) => void,
	_get: () => T & GenerationState
) {
	return {
		triggerGeneration: async (
			courseId: string,
			weekIds: string[],
			generationConfig: SelectiveGenerationConfig
		): Promise<GenerationResult> => {
			set({
				isLoading: true,
				error: null,
				status: "generating",
			});

			const result = await triggerOnDemandGeneration({
				courseId,
				weekIds,
				generationConfig,
				featureType,
			});
			if (result.success) {
				set({
					isLoading: false,
					status: "generating",
					error: null,
					generationRunId: result.runId,
					generationToken: result.publicAccessToken,
				});
			} else {
				set({
					isLoading: false,
					error: "Failed to trigger generation",
					status: "failed",
				});
			}

			return result;
		},

		resetGenerationState: () => {
			set({
				status: "idle",
				error: null,
				generationRunId: undefined,
				generationToken: undefined,
			});
		},
	};
}
