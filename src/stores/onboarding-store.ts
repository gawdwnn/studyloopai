"use client";

import type { PlanId } from "@/lib/database/types";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OnboardingState {
	// Flow control
	isVisible: boolean;
	currentStep: number;
	totalSteps: number;

	// Step completion tracking
	completedSteps: Set<number>;

	// User data collection
	profileData: {
		firstName?: string;
		lastName?: string;
		studyGoals?: string[];
	};

	planSelection: {
		selectedPlan?: PlanId;
	};
}

export interface OnboardingActions {
	showOnboarding: () => void;
	hideOnboarding: () => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
	goToStep: (step: number) => void;
	completeOnboarding: () => void;
	updateProfileData: (data: Partial<OnboardingState["profileData"]>) => void;
	getStepInfo: (step: number) => { title: string; slug: string };
	markStepCompleted: (step: number) => void;
	restartOnboarding: () => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

export const ONBOARDING_STEPS = {
	WELCOME_PROFILE: 1,
	PERSONALIZATION: 2,
	COMPLETION: 3,
} as const;

export const TOTAL_STEPS = Object.keys(ONBOARDING_STEPS).length;

export const STEP_SLUGS: Record<number, string> = {
	[ONBOARDING_STEPS.WELCOME_PROFILE]: "welcome-profile",
	[ONBOARDING_STEPS.PERSONALIZATION]: "personalization",
	[ONBOARDING_STEPS.COMPLETION]: "completion",
};

export const STUDY_GOALS = [
	{ id: "exam_prep", label: "Exam Preparation", icon: "📝" },
	{ id: "skill_building", label: "Skill Building", icon: "🎯" },
	{ id: "career_advancement", label: "Career Advancement", icon: "🚀" },
	{ id: "academic_research", label: "Academic Research", icon: "🔬" },
	{ id: "personal_interest", label: "Personal Interest", icon: "💡" },
	{ id: "certification", label: "Professional Certification", icon: "🏆" },
] as const;

const initialState: OnboardingState = {
	isVisible: false,
	currentStep: ONBOARDING_STEPS.WELCOME_PROFILE,
	totalSteps: TOTAL_STEPS,
	completedSteps: new Set(),
	profileData: {},
	planSelection: {
		selectedPlan: "free",
	},
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

			updateProfileData: (data) =>
				set((state) => ({
					profileData: { ...state.profileData, ...data },
				})),

			getStepInfo: (step) => {
				const stepInfo: Record<number, { title: string; slug: string }> = {
					[ONBOARDING_STEPS.WELCOME_PROFILE]: {
						title: "Welcome & Profile",
						slug: "welcome-profile",
					},
					[ONBOARDING_STEPS.PERSONALIZATION]: {
						title: "Personalization",
						slug: "personalization",
					},
					[ONBOARDING_STEPS.COMPLETION]: {
						title: "Completion",
						slug: "completion",
					},
				};
				return (
					stepInfo[step] || { title: "Unknown Step", slug: "welcome-profile" }
				);
			},

			markStepCompleted: (step) => {
				set((state) => ({
					completedSteps: new Set(state.completedSteps).add(step),
				}));
			},

			restartOnboarding: () => {
				set({ ...initialState, isVisible: true });
			},
		}),
		{
			name: "onboarding-store",
			storage: {
				getItem: (name) => {
					const str = localStorage.getItem(name);
					if (!str) return null;
					const { state, version } = JSON.parse(str);
					return {
						state: {
							...state,
							completedSteps: new Set(state.completedSteps),
						},
						version,
					};
				},
				setItem: (name, newValue) => {
					const str = JSON.stringify({
						state: {
							...newValue.state,
							completedSteps: Array.from(newValue.state.completedSteps),
						},
						version: newValue.version,
					});
					localStorage.setItem(name, str);
				},
				removeItem: (name) => localStorage.removeItem(name),
			},
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
