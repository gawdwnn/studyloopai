/**
 * Onboarding & User Journey Analytics Events
 * Server-side only events for tracking user onboarding flow and engagement
 */

import { trackServerEvent } from "../posthog";

// Helper to get step names for analytics
function getStepName(step: number): string {
	const stepNames: Record<number, string> = {
		1: "welcome_profile",
		2: "personalization",
		3: "billing",
		4: "completion",
	};
	return stepNames[step] || `step_${step}`;
}

export const onboardingEvents = {
	stepStarted: async (step: number, userId?: string) => {
		await trackServerEvent(
			"onboarding_step_started",
			{
				step,
				step_name: getStepName(step),
				event_category: "user_journey",
			},
			userId
		);
	},

	stepCompleted: async (
		step: number,
		properties: {
			hasProfileData?: boolean;
			dataKeys?: string[];
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"onboarding_step_completed",
			{
				step,
				step_name: getStepName(step),
				has_profile_data: properties.hasProfileData,
				data_keys: properties.dataKeys,
				event_category: "user_journey",
			},
			userId
		);
	},

	stepSkipped: async (
		step: number,
		reason: "user_skip" | "validation_bypass" = "user_skip",
		userId?: string
	) => {
		await trackServerEvent(
			"onboarding_step_skipped",
			{
				step,
				step_name: getStepName(step),
				skip_reason: reason,
				event_category: "user_journey",
			},
			userId
		);
	},

	onboardingCompleted: async (
		totalSteps = 4,
		completionTime?: number,
		userId?: string
	) => {
		await trackServerEvent(
			"onboarding_completed",
			{
				total_steps: totalSteps,
				completion_time_minutes: completionTime,
				event_category: "user_journey",
				funnel_step: "onboarding_completed",
			},
			userId
		);
	},

	onboardingAbandoned: async (
		abandonedAtStep: number,
		properties: {
			completionPercentage?: number;
			timeSpent?: number;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"onboarding_abandoned",
			{
				abandoned_at_step: abandonedAtStep,
				step_name: getStepName(abandonedAtStep),
				completion_percentage:
					properties.completionPercentage || (abandonedAtStep / 4) * 100,
				time_spent_minutes: properties.timeSpent,
				event_category: "user_journey",
			},
			userId
		);
	},

	profileSetup: async (
		properties: {
			hasFirstName?: boolean;
			hasLastName?: boolean;
			hasAvatar?: boolean;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"profile_setup_completed",
			{
				has_first_name: properties.hasFirstName,
				has_last_name: properties.hasLastName,
				has_avatar: properties.hasAvatar,
				profile_completeness: Object.values(properties).filter(Boolean).length,
				event_category: "user_journey",
			},
			userId
		);
	},

	personalizationCompleted: async (
		properties: {
			studyGoals?: string[];
			preferredStudyTime?: string;
			experience?: string;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"personalization_completed",
			{
				study_goals: properties.studyGoals,
				study_goals_count: properties.studyGoals?.length || 0,
				preferred_study_time: properties.preferredStudyTime,
				experience_level: properties.experience,
				event_category: "user_journey",
			},
			userId
		);
	},
};
