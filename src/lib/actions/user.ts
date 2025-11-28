"use server";

import { db } from "@/db";
import { userPlans, users } from "@/db/schema";
import { setUserProperties, trackServerEvent } from "@/lib/analytics/posthog";
import { invalidateOnboardingCache } from "@/lib/middleware/onboarding";
import { getServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createUserPlan } from "./plans";

export async function getOnboardingProgress() {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		// Return fallback for unauthenticated users (data fetching)
		return {
			success: false,
			currentStep: 1,
			data: {
				firstName: null,
				lastName: null,
				selectedPlan: undefined,
			},
			completed: false,
			skipped: false,
		};
	}

	try {
		const userData = await db.query.users.findFirst({
			where: eq(users.userId, user.id),
			columns: {
				currentOnboardingStep: true,
				onboardingData: true,
				onboardingCompleted: true,
				onboardingSkipped: true,
				firstName: true,
				lastName: true,
			},
		});

		if (!userData) {
			// Return fallback for missing user data
			return {
				success: false,
				currentStep: 1,
				data: {
					firstName: null,
					lastName: null,
					selectedPlan: undefined,
				},
				completed: false,
				skipped: false,
			};
		}

		// Get user plan if exists
		const userPlan = await db.query.userPlans.findFirst({
			where: eq(userPlans.userId, user.id),
		});

		// Combine data from both onboarding_data and actual user fields + plan
		const combinedData = {
			...(userData.onboardingData || {}),
			// Override with actual user table data
			firstName: userData.firstName,
			lastName: userData.lastName,
			selectedPlan: userPlan?.planId,
		};

		return {
			success: true,
			currentStep: userData.currentOnboardingStep,
			data: combinedData,
			completed: userData.onboardingCompleted,
			skipped: userData.onboardingSkipped,
		};
	} catch (error) {
		logger.error(
			{
				err: error,
				action: "getOnboardingProgress",
				userId: user.id,
			},
			"Failed to get onboarding progress"
		);
		// Return fallback on error
		return {
			success: false,
			currentStep: 1,
			data: {
				firstName: null,
				lastName: null,
				selectedPlan: undefined,
			},
			completed: false,
			skipped: false,
		};
	}
}

export async function skipOnboarding() {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Authentication required");
	}

	try {
		// Get current step for analytics
		const currentUser = await db.query.users.findFirst({
			where: eq(users.userId, user.id),
			columns: { currentOnboardingStep: true },
		});

		// Ensure user has a plan when skipping onboarding
		await createUserPlan("free", user.id);

		await db
			.update(users)
			.set({ onboardingSkipped: true })
			.where(eq(users.userId, user.id));

		// Track onboarding abandonment analytics
		await trackServerEvent(
			"onboarding_abandoned",
			{
				abandoned_at_step: currentUser?.currentOnboardingStep || 1,
				step_name: getStepName(currentUser?.currentOnboardingStep || 1),
				completion_percentage:
					((currentUser?.currentOnboardingStep || 1) / 4) * 100,
				event_category: "user_journey",
			},
			user.id
		);

		// Invalidate onboarding cache since status changed
		await invalidateOnboardingCache(user.id);

		revalidatePath("/", "layout");
		return { success: true };
	} catch (error) {
		logger.error(
			{
				err: error,
				action: "skipOnboarding",
				userId: user.id,
			},
			"Failed to skip onboarding"
		);
		throw new Error("Could not update your onboarding status.");
	}
}

// Helper function to get current user onboarding data
async function getUserOnboardingData(userId: string) {
	return await db.query.users.findFirst({
		where: eq(users.userId, userId),
		columns: { onboardingData: true },
	});
}

// Helper function to extract user profile fields from onboarding data
function extractUserProfileData(data: Record<string, unknown>) {
	const profileUpdates: { firstName?: string; lastName?: string } = {};

	if (data.firstName && typeof data.firstName === "string") {
		profileUpdates.firstName = data.firstName;
	}
	if (data.lastName && typeof data.lastName === "string") {
		profileUpdates.lastName = data.lastName;
	}

	return profileUpdates;
}

// Save onboarding step progress and data
async function saveOnboardingStep(
	userId: string,
	step: number,
	onboardingData: Record<string, unknown>
) {
	const profileData = extractUserProfileData(onboardingData);

	// Remove firstName/lastName from onboardingData since they have dedicated columns
	const { firstName, lastName, ...cleanOnboardingData } = onboardingData;

	await db.transaction(async (tx) => {
		const userUpdates = {
			currentOnboardingStep: step,
			onboardingData: cleanOnboardingData, // Only store non-profile data
			...profileData, // firstName/lastName go to dedicated columns
		};

		await tx.update(users).set(userUpdates).where(eq(users.userId, userId));
	});

	// Track step progression analytics
	await trackServerEvent(
		"onboarding_step_completed",
		{
			step,
			step_name: getStepName(step),
			has_profile_data: !!(profileData.firstName && profileData.lastName),
			data_keys: Object.keys(cleanOnboardingData),
			event_category: "user_journey",
		},
		userId
	);
}

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

// Track individual step skip analytics
export async function trackStepSkipped(
	step: number,
	reason: "user_skip" | "validation_bypass" = "user_skip"
) {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Authentication required");
	}

	try {
		await trackServerEvent(
			"onboarding_step_skipped",
			{
				step,
				step_name: getStepName(step),
				skip_reason: reason,
				event_category: "user_journey",
			},
			user.id
		);

		return { success: true };
	} catch (error) {
		logger.error(
			{
				err: error,
				userId: user.id,
				step,
				reason,
			},
			"Failed to track step skip"
		);
		throw new Error("Analytics tracking failed");
	}
}

// Track step start analytics
export async function trackStepStarted(step: number) {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Authentication required");
	}

	try {
		await trackServerEvent(
			"onboarding_step_started",
			{
				step,
				step_name: getStepName(step),
				event_category: "user_journey",
			},
			user.id
		);

		return { success: true };
	} catch (error) {
		logger.error(
			{
				err: error,
				userId: user.id,
				step,
			},
			"Failed to track step start"
		);
		throw new Error("Analytics tracking failed");
	}
}

export async function updateOnboardingStep(
	step: number,
	data?: Record<string, unknown>
): Promise<{
	success: boolean;
	step?: number;
	data?: Record<string, unknown>;
	error?: string;
}> {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		logger.error(
			{
				action: "updateOnboardingStep",
				step,
				data,
			},
			"Authentication required"
		);
		return {
			success: false,
			error: "Authentication required",
		};
	}

	try {
		// Get current onboarding data
		const currentUser = await getUserOnboardingData(user.id);

		// Merge new data with existing data
		const existingData =
			(currentUser?.onboardingData as Record<string, unknown>) || {};
		const updatedData = data ? { ...existingData, ...data } : existingData;

		// Save the updated step and data
		await saveOnboardingStep(user.id, step, updatedData);

		// Invalidate onboarding cache since status changed
		await invalidateOnboardingCache(user.id);

		revalidatePath("/", "layout");
		return { success: true, step, data: updatedData };
	} catch (error) {
		logger.error(
			{
				err: error,
				action: "updateOnboardingStep",
				userId: user.id,
				step,
				data,
			},
			"Failed to update onboarding step"
		);
		return {
			success: false,
			error: "Could not update your onboarding progress.",
		};
	}
}

export async function completeOnboarding() {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Authentication required");
	}

	try {
		// Get user data for analytics before completing
		const userData = await db.query.users.findFirst({
			where: eq(users.userId, user.id),
			columns: {
				onboardingData: true,
				firstName: true,
				lastName: true,
			},
		});

		// Get user plan for completion analytics
		const userPlan = await db.query.userPlans.findFirst({
			where: eq(userPlans.userId, user.id),
		});

		await db
			.update(users)
			.set({
				onboardingCompleted: true,
				currentOnboardingStep: null, // Clear step when completed
			})
			.where(eq(users.userId, user.id));

		// Track successful onboarding completion
		await trackServerEvent(
			"onboarding_completed",
			{
				total_steps: 4,
				completion_percentage: 100,
				has_profile: !!(userData?.firstName && userData?.lastName),
				selected_plan: userPlan?.planId || "none",
				study_goals: userData?.onboardingData
					? (
							(userData.onboardingData as Record<string, unknown>)
								?.studyGoals as string[]
						)?.length || 0
					: 0,
				event_category: "user_journey",
			},
			user.id
		);

		// Set user properties for segmentation
		await setUserProperties(user.id, {
			onboarding_completed: true,
			onboarding_completion_date: new Date().toISOString(),
			has_profile_data: !!(userData?.firstName && userData?.lastName),
			selected_plan: userPlan?.planId || "free",
		});

		// Invalidate onboarding cache since status changed to completed
		await invalidateOnboardingCache(user.id);

		revalidatePath("/", "layout");
		return { success: true };
	} catch (error) {
		logger.error(
			{
				err: error,
				action: "completeOnboarding",
				userId: user.id,
			},
			"Failed to complete onboarding"
		);
		throw new Error("Could not update your onboarding status.");
	}
}
