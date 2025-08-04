"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OnboardingState {
	// Flow control
	isVisible: boolean;
	currentStep: number;
	totalSteps: number;
}

export interface OnboardingActions {
	showOnboarding: () => void;
	hideOnboarding: () => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
	goToStep: (step: number) => void;
	completeOnboarding: () => void;
	getStepInfo: (step: number) => { title: string; slug: string };
	restartOnboarding: () => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

export const ONBOARDING_STEPS = {
	WELCOME_PROFILE: 1,
	PERSONALIZATION: 2,
	BILLING: 3,
	COMPLETION: 4,
} as const;

export const TOTAL_STEPS = Object.keys(ONBOARDING_STEPS).length;

export const STEP_SLUGS: Record<number, string> = {
	[ONBOARDING_STEPS.WELCOME_PROFILE]: "welcome-profile",
	[ONBOARDING_STEPS.PERSONALIZATION]: "personalization",
	[ONBOARDING_STEPS.BILLING]: "billing",
	[ONBOARDING_STEPS.COMPLETION]: "completion",
};

export const STUDY_GOALS = [
	{ id: "exam_prep", label: "Exam Preparation" },
	{ id: "skill_building", label: "Skill Building" },
	{ id: "career_advancement", label: "Career Advancement" },
	{ id: "academic_research", label: "Academic Research" },
	{ id: "personal_interest", label: "Personal Interest" },
	{ id: "certification", label: "Professional Certification" },
] as const;

const initialState: OnboardingState = {
	isVisible: false,
	currentStep: ONBOARDING_STEPS.WELCOME_PROFILE,
	totalSteps: TOTAL_STEPS,
};

export const useOnboardingStore = create<OnboardingStore>()(
	persist(
		(set, get) => ({
			...initialState,

			showOnboarding: () => set({ isVisible: true, currentStep: 1 }),
			hideOnboarding: () => set({ isVisible: false }),

			goToNextStep: () => {
				const { currentStep, goToStep } = get();
				if (currentStep < TOTAL_STEPS) {
					goToStep(currentStep + 1);
				}
			},

			goToPreviousStep: () => {
				const { currentStep, goToStep } = get();
				if (currentStep > 1) {
					goToStep(currentStep - 1);
				}
			},

			goToStep: (step) => set({ currentStep: step }),

			completeOnboarding: () => {
				set({ isVisible: false, currentStep: TOTAL_STEPS });
			},

			getStepInfo: (step) => {
				const stepTitles: Record<number, string> = {
					[ONBOARDING_STEPS.WELCOME_PROFILE]: "Welcome & Profile",
					[ONBOARDING_STEPS.PERSONALIZATION]: "Personalization",
					[ONBOARDING_STEPS.BILLING]: "Choose Your Plan",
					[ONBOARDING_STEPS.COMPLETION]: "Completion",
				};

				return {
					title: stepTitles[step] || "Unknown Step",
					slug: STEP_SLUGS[step] || "welcome-profile",
				};
			},

			restartOnboarding: () => {
				set({ ...initialState, isVisible: true });
			},
		}),
		{
			name: "onboarding-store",
		}
	)
);

export const useOnboardingNavigation = () => {
	const router = useRouter();
	const { goToStep, currentStep, totalSteps } = useOnboardingStore();

	const navigateToStep = useCallback(
		(step: number) => {
			if (step > 0 && step <= totalSteps) {
				goToStep(step);
				router.push(`/onboarding/${STEP_SLUGS[step]}`);
			}
		},
		[goToStep, router, totalSteps]
	);

	return { navigateToStep, currentStep };
};

export const useOnboardingProgress = () => {
	return useOnboardingStore(
		(state) => (state.currentStep / state.totalSteps) * 100
	);
};
