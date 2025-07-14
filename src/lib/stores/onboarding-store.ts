"use client";

import type { PlanId } from "@/lib/plans/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OnboardingState {
	// Flow control
	isVisible: boolean;
	currentStep: number;
	totalSteps: number;
	isSkippingAll: boolean;

	// Step completion tracking
	completedSteps: Set<number>;
	skippedSteps: Set<number>;

	// User data collection
	profileData: {
		firstName?: string;
		lastName?: string;
		country?: string;
		institution?: string;
		studyGoals?: string[];
		academicLevel?: string;
	};

	preferences: {
		notifications?: boolean;
		emailUpdates?: boolean;
		theme?: "light" | "dark" | "system";
		studyReminders?: boolean;
	};

	planSelection: {
		selectedPlan?: PlanId;
		isSkipped: boolean;
	};

	// Progress tracking
	startedAt?: string;
	lastActiveStep?: number;
	timeSpentPerStep: Record<number, number>;
}

export interface OnboardingActions {
	// Flow control
	showOnboarding: () => void;
	hideOnboarding: () => void;
	nextStep: () => void;
	previousStep: () => void;
	goToStep: (step: number) => void;
	skipCurrentStep: () => void;
	skipAllRemaining: () => void;
	restartOnboarding: () => void;
	completeOnboarding: () => void;

	// Data updates
	updateProfileData: (data: Partial<OnboardingState["profileData"]>) => void;
	updatePreferences: (prefs: Partial<OnboardingState["preferences"]>) => void;
	selectPlan: (planId: PlanId) => void;
	skipPlanSelection: () => void;

	// Progress tracking
	markStepCompleted: (step: number) => void;
	markStepSkipped: (step: number) => void;
	trackTimeOnStep: (step: number, timeMs: number) => void;

	// Persistence
	saveProgress: () => void;
	clearOnboardingData: () => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

// Onboarding step definitions
export const ONBOARDING_STEPS = {
	WELCOME: 1,
	PROFILE: 2,
	STUDY_GOALS: 3,
	PREFERENCES: 4,
	PLAN_SELECTION: 5,
	COMPLETION: 6,
} as const;

export const TOTAL_STEPS = Object.keys(ONBOARDING_STEPS).length;

// Study goals options
export const STUDY_GOALS = [
	{ id: "exam_prep", label: "Exam Preparation", icon: "📝" },
	{ id: "skill_building", label: "Skill Building", icon: "🎯" },
	{ id: "career_advancement", label: "Career Advancement", icon: "🚀" },
	{ id: "academic_research", label: "Academic Research", icon: "🔬" },
	{ id: "personal_interest", label: "Personal Interest", icon: "💡" },
	{ id: "certification", label: "Professional Certification", icon: "🏆" },
] as const;

// Academic level options
export const ACADEMIC_LEVELS = [
	{ id: "high_school", label: "High School" },
	{ id: "undergraduate", label: "Undergraduate" },
	{ id: "graduate", label: "Graduate" },
	{ id: "postgraduate", label: "Postgraduate" },
	{ id: "professional", label: "Professional" },
	{ id: "other", label: "Other" },
] as const;

const initialState: OnboardingState = {
	isVisible: false,
	currentStep: ONBOARDING_STEPS.WELCOME,
	totalSteps: TOTAL_STEPS,
	isSkippingAll: false,
	completedSteps: new Set(),
	skippedSteps: new Set(),
	profileData: {},
	preferences: {
		notifications: true,
		emailUpdates: false,
		theme: "system",
		studyReminders: true,
	},
	planSelection: {
		isSkipped: false,
	},
	timeSpentPerStep: {},
};

export const useOnboardingStore = create<OnboardingStore>()(
	persist(
		(set, get) => ({
			...initialState,

			// Flow control
			showOnboarding: () => {
				const now = new Date().toISOString();
				set((state) => ({
					isVisible: true,
					startedAt: state.startedAt || now,
					lastActiveStep: state.currentStep,
				}));
			},

			hideOnboarding: () => {
				set({ isVisible: false });
			},

			nextStep: () => {
				set((state) => {
					const nextStep = Math.min(state.currentStep + 1, state.totalSteps);
					return {
						currentStep: nextStep,
						lastActiveStep: nextStep,
					};
				});
			},

			previousStep: () => {
				set((state) => ({
					currentStep: Math.max(state.currentStep - 1, 1),
				}));
			},

			goToStep: (step: number) => {
				set((state) => ({
					currentStep: Math.max(1, Math.min(step, state.totalSteps)),
					lastActiveStep: step,
				}));
			},

			skipCurrentStep: () => {
				const { currentStep, markStepSkipped, nextStep } = get();
				markStepSkipped(currentStep);
				nextStep();
			},

			skipAllRemaining: () => {
				set((state) => {
					const remainingSteps = new Set(state.skippedSteps);
					for (let i = state.currentStep; i <= state.totalSteps; i++) {
						remainingSteps.add(i);
					}
					return {
						isSkippingAll: true,
						skippedSteps: remainingSteps,
						currentStep: state.totalSteps, // Go to completion
					};
				});
			},

			restartOnboarding: () => {
				set({
					...initialState,
					isVisible: true,
					startedAt: new Date().toISOString(),
				});
			},

			completeOnboarding: () => {
				set((state) => ({
					isVisible: false,
					completedSteps: new Set([...state.completedSteps, state.currentStep]),
				}));
			},

			// Data updates
			updateProfileData: (data) => {
				set((state) => ({
					profileData: { ...state.profileData, ...data },
				}));
			},

			updatePreferences: (prefs) => {
				set((state) => ({
					preferences: { ...state.preferences, ...prefs },
				}));
			},

			selectPlan: (planId) => {
				set((state) => ({
					planSelection: {
						...state.planSelection,
						selectedPlan: planId,
						isSkipped: false,
					},
				}));
			},

			skipPlanSelection: () => {
				set((state) => ({
					planSelection: {
						...state.planSelection,
						isSkipped: true,
					},
				}));
			},

			// Progress tracking
			markStepCompleted: (step) => {
				set((state) => ({
					completedSteps: new Set([...state.completedSteps, step]),
				}));
			},

			markStepSkipped: (step) => {
				set((state) => ({
					skippedSteps: new Set([...state.skippedSteps, step]),
				}));
			},

			trackTimeOnStep: (step, timeMs) => {
				set((state) => ({
					timeSpentPerStep: {
						...state.timeSpentPerStep,
						[step]: (state.timeSpentPerStep[step] || 0) + timeMs,
					},
				}));
			},

			// Persistence
			saveProgress: () => {
				// Auto-saved via zustand persist middleware
			},

			clearOnboardingData: () => {
				set(initialState);
			},
		}),
		{
			name: "studyloop-onboarding",
			// Only persist essential data, not UI state
			partialize: (state) => ({
				completedSteps: Array.from(state.completedSteps),
				skippedSteps: Array.from(state.skippedSteps),
				profileData: state.profileData,
				preferences: state.preferences,
				planSelection: state.planSelection,
				startedAt: state.startedAt,
				lastActiveStep: state.lastActiveStep,
				timeSpentPerStep: state.timeSpentPerStep,
			}),
			// Rehydrate sets back to arrays
			onRehydrateStorage: () => (state) => {
				if (state) {
					state.completedSteps = new Set(state.completedSteps as unknown as number[]);
					state.skippedSteps = new Set(state.skippedSteps as unknown as number[]);
				}
			},
		}
	)
);

// Helper hooks for specific onboarding logic
export const useOnboardingProgress = () => {
	const { completedSteps, skippedSteps, totalSteps, currentStep } = useOnboardingStore();

	const completedCount = completedSteps.size;
	const skippedCount = skippedSteps.size;
	const progressPercentage = ((completedCount + skippedCount) / totalSteps) * 100;
	const isStepCompleted = (step: number) => completedSteps.has(step);
	const isStepSkipped = (step: number) => skippedSteps.has(step);

	return {
		completedCount,
		skippedCount,
		progressPercentage,
		currentStep,
		totalSteps,
		isStepCompleted,
		isStepSkipped,
	};
};

export const useOnboardingTrigger = () => {
	const store = useOnboardingStore();

	// Logic to determine if onboarding should be shown
	const shouldShowOnboarding = () => {
		const { completedSteps, skippedSteps, isSkippingAll } = store;

		// Don't show if user skipped all or completed all steps
		if (isSkippingAll || completedSteps.size + skippedSteps.size >= TOTAL_STEPS) {
			return false;
		}

		// Show for new users or users who haven't completed onboarding
		return completedSteps.size < 3; // Show until at least 3 steps are done
	};

	return {
		shouldShowOnboarding,
		triggerOnboarding: store.showOnboarding,
	};
};
