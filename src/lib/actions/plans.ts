"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { PLANS } from "../plans/config";
import type { PlanId } from "../plans/types";
import { FEATURE_IDS } from "../plans/types";

export async function createUserPlan(planId: PlanId) {
  const supabase = createServerActionClient({ cookies });

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not found");
  }

  // Calculate expires_at based on plan
  let expiresAt = null;
  if (planId === "monthly") {
    expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else if (planId === "yearly") {
    expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  // Create the user plan
  const { error: planError } = await supabase.from("user_plans").insert({
    user_id: user.id,
    plan_id: planId,
    started_at: new Date().toISOString(),
    expires_at: expiresAt?.toISOString() || null,
    is_active: true,
  });

  if (planError) {
    throw new Error("Failed to create user plan");
  }
}

export async function getUserPlan() {
  const supabase = createServerActionClient({ cookies });

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

    // Check if plan has expired
    if (plan.expires_at) {
      const expiresAt = new Date(plan.expires_at);
      const now = new Date();
      return now < expiresAt;
    }

    // Free plan or no expiration
    return true;
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    return null;
  }
}
