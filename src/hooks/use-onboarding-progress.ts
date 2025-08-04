import { getOnboardingProgress } from "@/lib/actions/user";
import type { PlanId } from "@/lib/database/types";
import { useQuery } from "@tanstack/react-query";

export interface OnboardingData {
	firstName?: string;
	lastName?: string;
	studyGoals?: string[];
	selectedPlan?: string;
}

export interface OnboardingProgress {
	currentStep: number | null;
	data: OnboardingData;
	completed: boolean;
	skipped: boolean;
}

/**
 * Custom hook for managing onboarding progress with React Query
 * Provides elegant data fetching, caching, and error handling
 */
export function useOnboardingProgress() {
	return useQuery({
		queryKey: ["onboarding-progress"],
		queryFn: async (): Promise<OnboardingProgress> => {
			const result = await getOnboardingProgress();

			if (!result.success) {
				throw new Error("Failed to load onboarding progress");
			}

			return {
				currentStep: result.currentStep,
				data: (result.data as OnboardingData) || {},
				completed: result.completed || false,
				skipped: result.skipped || false,
			};
		},
		// Cache for 5 minutes, stale while revalidate
		staleTime: 5 * 60 * 1000,
		// Keep in cache for 10 minutes when unused
		gcTime: 10 * 60 * 1000,
		// Retry once on failure
		retry: 1,
		// Don't refetch on window focus during active onboarding
		refetchOnWindowFocus: false,
	});
}

/**
 * Specialized hook for step-specific data extraction
 * Provides typed data for individual onboarding steps
 */
export function useOnboardingStepData<T extends keyof OnboardingData>(
	stepField: T
): {
	data: OnboardingData[T];
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
} {
	const { data: progress, isLoading, isError, error } = useOnboardingProgress();

	return {
		data: progress?.data[stepField],
		isLoading,
		isError,
		error,
	};
}

/**
 * Hook for profile step (firstName, lastName)
 */
export function useProfileStepData() {
	const { data: progress, isLoading, isError } = useOnboardingProgress();

	return {
		firstName: progress?.data.firstName || "",
		lastName: progress?.data.lastName || "",
		isLoading,
		isError,
		// Check if profile data exists and is valid
		hasValidProfile: !!(progress?.data.firstName && progress?.data.lastName),
	};
}

/**
 * Hook for personalization step (studyGoals)
 */
export function usePersonalizationStepData() {
	const { data: progress, isLoading, isError } = useOnboardingProgress();

	return {
		studyGoals: progress?.data.studyGoals || [],
		isLoading,
		isError,
		hasGoals: (progress?.data.studyGoals?.length || 0) > 0,
	};
}

/**
 * Hook for billing step (selectedPlan)
 */
export function useBillingStepData() {
	const { data: progress, isLoading, isError } = useOnboardingProgress();

	return {
		selectedPlan: progress?.data.selectedPlan as PlanId | undefined,
		isLoading,
		isError,
		hasPlanSelected: !!progress?.data.selectedPlan,
		// Pass the selectedPlan as currentUserPlan for PlanSelector
		currentUserPlan: progress?.data.selectedPlan as PlanId | undefined,
	};
}
