"use server";

import { revalidatePath } from "next/cache";
import { UserAuthCache } from "@/lib/cache/redis-cache";
import { SIGNUP_STEPS } from "@/lib/constants/auth";
import { PLANS } from "@/lib/plans/config";
import type { PlanId } from "@/lib/plans/types";
import { FEATURE_IDS } from "@/lib/plans/types";
import { getServerClient } from "@/lib/supabase/server";

export async function createUserPlan(planId: PlanId, userId?: string) {
  const supabase = await getServerClient();

  let effectiveUserId = userId;

  // Get the current user if userId is not provided
  if (!effectiveUserId) {
    const {
      data: { user: sessionUser },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !sessionUser) {
      throw new Error("User not found");
    }
    effectiveUserId = sessionUser.id;
  }

  // Calculate current_period_end based on plan
  let currentPeriodEnd = null;
  if (planId === "monthly") {
    currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  } else if (planId === "yearly") {
    currentPeriodEnd = new Date();
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  }

  // Use a transaction-like approach with proper error handling
  // First, check if user already has an active plan to prevent duplicates
  const { data: existingPlan } = await supabase
    .from("user_plans")
    .select("id")
    .eq("user_id", effectiveUserId)
    .eq("is_active", true)
    .single();

  if (existingPlan) {
    // User already has an active plan, just update signup step
    const { error: updateUserError } = await supabase
      .from("users")
      .update({ signup_step: SIGNUP_STEPS.COMPLETE, updated_at: new Date().toISOString() })
      .eq("user_id", effectiveUserId);

    if (updateUserError) {
      throw new Error(`Failed to update user signup step: ${updateUserError.message}`);
    }

    // Update cache with new signup step
    const authCache = new UserAuthCache();
    await authCache.setUserAuthData(effectiveUserId, SIGNUP_STEPS.COMPLETE);
    
    return;
  }

  // Create the user plan with correct column names
  const { error: planError } = await supabase.from("user_plans").insert({
    user_id: effectiveUserId,
    plan_id: planId,
    current_period_end: currentPeriodEnd?.toISOString() || null,
    is_active: true,
    // started_at, created_at, updated_at will use database defaults
  });

  if (planError) {
    throw new Error(`Failed to create user plan: ${planError.message}`);
  }

  // Update user's signup step to complete
  const { error: updateUserError } = await supabase
    .from("users")
    .update({ signup_step: SIGNUP_STEPS.COMPLETE, updated_at: new Date().toISOString() })
    .eq("user_id", effectiveUserId);

  if (updateUserError) {
    // Critical: Plan was created but signup step update failed
    // Attempt to rollback the plan creation
    const { error: rollbackError } = await supabase
      .from("user_plans")
      .delete()
      .eq("user_id", effectiveUserId)
      .eq("plan_id", planId);

    if (rollbackError) {
      // Log the rollback failure but still throw the original error
      console.error(`Critical: Failed to rollback plan creation after signup step update failed. User ${effectiveUserId} may have orphaned plan.`, rollbackError);
    }

    throw new Error(`Failed to update user signup step: ${updateUserError.message}`);
  }

  // Update cache with new signup step
  const authCache = new UserAuthCache();
  await authCache.setUserAuthData(effectiveUserId, SIGNUP_STEPS.COMPLETE);

  revalidatePath("/dashboard");
}

export async function getUserPlan() {
  const supabase = await getServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not found");
  }

  const { data: plan, error: planError } = await supabase
    .from("user_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (planError) {
    throw new Error("Failed to fetch user plan");
  }

  return plan;
}

export async function isPlanActive() {
  try {
    const plan = await getUserPlan();
    if (!plan) return false;

    // Check if plan has expired - using correct column name
    if (plan.current_period_end) {
      const expiresAt = new Date(plan.current_period_end);
      const now = new Date();
      return now < expiresAt;
    }

    // Free plan or no expiration
    return true;
  } catch (_error) {
    return false;
  }
}

export async function hasFeatureAccess(featureId: keyof typeof FEATURE_IDS) {
  try {
    const plan = await getUserPlan();
    if (!plan) return false;

    // Check if plan is active
    if (!(await isPlanActive())) return false;

    // Get plan details from config
    const planConfig = PLANS.find((p) => p.id === plan.plan_id);
    if (!planConfig) return false;

    // Check if feature is included in plan
    const feature = planConfig.features.find(
      (f) => f.id === FEATURE_IDS[featureId]
    );
    return feature?.included ?? false;
  } catch (_error) {
    return false;
  }
}

// Helper function to get feature limits (e.g., number of uploads allowed)
export async function getFeatureLimit(featureId: keyof typeof FEATURE_IDS) {
  try {
    const plan = await getUserPlan();
    if (!plan) return null;

    // Check if plan is active
    if (!(await isPlanActive())) return null;

    // Get plan details from config
    const planConfig = PLANS.find((p) => p.id === plan.plan_id);
    if (!planConfig) return null;

    // Find feature and extract limit from name
    const feature = planConfig.features.find(
      (f) => f.id === FEATURE_IDS[featureId]
    );
    if (!feature?.included) return null;

    // Extract numeric limit from feature name (e.g., "Up to 3 document uploads" -> 3)
    const match = feature.name.match(/(\d+)/);
    return match ? Number.parseInt(match[1], 10) : null;
  } catch (_error) {
    return null;
  }
}
