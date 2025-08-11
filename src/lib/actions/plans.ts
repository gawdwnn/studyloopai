"use server";

import { db } from "@/db";
import { userPlans, userUsage, users } from "@/db/schema";
import { env } from "@/env";
import { PLANS, PLAN_QUOTAS, type UsageMetric } from "@/lib/config/plans";
import type { PlanId } from "@/lib/database/types";
import { FEATURE_IDS } from "@/lib/database/types";
import { createPolarClient } from "@/lib/polar/client";
import { getProducts } from "@/lib/polar/products";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { createLogger } from "@/lib/utils/logger";
import { addMonths, addYears } from "date-fns";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const logger = createLogger("billing:plans");

export async function createUserPlan(planId: PlanId, userId: string) {
	return await withErrorHandling(
		async () => {
			// Calculate currentPeriodEnd based on plan
			let currentPeriodEnd: Date | null = null;
			const now = new Date();
			if (planId === "monthly") {
				currentPeriodEnd = addMonths(now, 1);
			} else if (planId === "yearly") {
				currentPeriodEnd = addYears(now, 1);
			}

			// Check if user already has an active plan
			const existingPlan = await db.query.userPlans.findFirst({
				where: and(eq(userPlans.userId, userId), eq(userPlans.isActive, true)),
			});

			if (existingPlan) {
				// User already has an active plan - no action needed
				return { success: true, message: "User already has an active plan" };
			}

			// Create the user plan
			const [newPlan] = await db
				.insert(userPlans)
				.values({
					userId,
					planId,
					currentPeriodEnd,
					isActive: true,
				})
				.returning();

			revalidatePath("/dashboard");
			return { success: true, plan: newPlan };
		},
		"createUserPlan",
		{ success: false, message: "Failed to create user plan" }
	);
}

export async function getUserPlan() {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();

			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				throw new Error("User not found");
			}

			const plan = await db.query.userPlans.findFirst({
				where: and(eq(userPlans.userId, user.id), eq(userPlans.isActive, true)),
			});

			return plan;
		},
		"getUserPlan",
		null
	);
}

export async function isPlanActive() {
	return await withErrorHandling(
		async () => {
			const plan = await getUserPlan();
			if (!plan) return false;

			// Check if plan has expired - using correct column name
			if (plan.currentPeriodEnd) {
				const expiresAt = new Date(plan.currentPeriodEnd);
				const now = new Date();
				return now < expiresAt;
			}

			// Free plan or no expiration
			return true;
		},
		"isPlanActive",
		false
	);
}

export async function hasFeatureAccess(featureId: keyof typeof FEATURE_IDS) {
	return await withErrorHandling(
		async () => {
			const plan = await getUserPlan();
			if (!plan) return false;

			// Check if plan is active
			if (!(await isPlanActive())) return false;

			// Get plan details from config
			const planConfig = PLANS.find((p) => p.id === plan.planId);
			if (!planConfig) return false;

			// Check if feature is included in plan
			const feature = planConfig.features.find(
				(f) => f.id === FEATURE_IDS[featureId]
			);
			return feature?.included ?? false;
		},
		"hasFeatureAccess",
		false
	);
}

// Helper function to get feature limits (e.g., number of uploads allowed)
export async function getFeatureLimit(featureId: keyof typeof FEATURE_IDS) {
	return await withErrorHandling(
		async () => {
			const plan = await getUserPlan();
			if (!plan) return null;

			// Check if plan is active
			if (!(await isPlanActive())) return null;

			// Get plan details from config
			const planConfig = PLANS.find((p) => p.id === plan.planId);
			if (!planConfig) return null;

			// Find feature and extract limit from name
			const feature = planConfig.features.find(
				(f) => f.id === FEATURE_IDS[featureId]
			);
			if (!feature?.included) return null;

			// Extract numeric limit from feature name (e.g., "Up to 3 document uploads" -> 3)
			const match = feature.name.match(/(\d+)/);
			return match ? Number.parseInt(match[1], 10) : null;
		},
		"getFeatureLimit",
		null
	);
}

// Unified plan selection handler - handles both free and paid plans
export async function selectPlan(
	planId: PlanId,
	context: "onboarding" | "account" = "account"
) {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();

			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				return { success: false, error: "Authentication required" };
			}

			// Handle free plan - create userPlans record immediately
			if (planId === "free") {
				const result = await createUserPlan(planId, user.id);
				if (!result.success) {
					return {
						success: false,
						error: result.message || "Failed to select free plan",
					};
				}
				return { success: true, planId: "free" };
			}

			// Debug environment configuration
			logger.info("SelectPlan: Starting checkout creation", {
				planId,
				context,
				userId: user.id,
				environment: env.NODE_ENV,
				hasPolarToken: !!env.POLAR_ACCESS_TOKEN,
				hasOrgId: !!env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID,
				siteUrl: env.NEXT_PUBLIC_SITE_URL,
			});

			// Get products and create checkout for paid plans - no premature plan creation
			let products: Awaited<ReturnType<typeof getProducts>>;
			try {
				products = await getProducts();
				logger.info("SelectPlan: Products retrieved", {
					monthlyProductId: products.monthlyProductId,
					yearlyProductId: products.yearlyProductId,
				});
			} catch (error) {
				logger.error("SelectPlan: Failed to get products", {
					error: error instanceof Error ? error.message : error,
				});
				return { success: false, error: "Products not configured properly" };
			}

			const { monthlyProductId, yearlyProductId } = products;
			const productId =
				planId === "monthly" ? monthlyProductId : yearlyProductId;

			if (!productId) {
				logger.error("SelectPlan: Product ID not found", {
					planId,
					monthlyProductId,
					yearlyProductId,
				});
				return {
					success: false,
					error: `Product not found for plan: ${planId}`,
				};
			}

			// Context-aware success URL
			const successUrl =
				context === "onboarding"
					? `${env.NEXT_PUBLIC_SITE_URL}/onboarding/completion?checkout_id={CHECKOUT_ID}&payment_success=true`
					: `${env.NEXT_PUBLIC_SITE_URL}/dashboard/billing/success?checkout_id={CHECKOUT_ID}`;

			// Create checkout session - plan will be created after payment via webhook
			const polarClient = createPolarClient();

			logger.info("SelectPlan: Creating checkout", {
				productId,
				successUrl,
				metadata: {
					userId: user.id,
					planId,
					context,
				},
			});

			let checkout: Awaited<ReturnType<typeof polarClient.checkouts.create>>;
			try {
				checkout = await polarClient.checkouts.create({
					products: [productId],
					successUrl,
					metadata: {
						userId: user.id,
						planId,
						context,
					},
				});

				logger.info("SelectPlan: Checkout created successfully", {
					checkoutId: checkout?.id,
					checkoutUrl: checkout?.url,
					hasUrl: !!checkout?.url,
				});
			} catch (error) {
				logger.error("SelectPlan: Polar checkout creation failed", {
					error: error instanceof Error ? error.message : error,
					productId,
					successUrl,
				});
				return { success: false, error: "Failed to create checkout session" };
			}

			if (!checkout?.url) {
				logger.error("SelectPlan: Checkout created but no URL returned", {
					checkout,
					checkoutId: checkout?.id,
				});
				return {
					success: false,
					error: "Checkout session created but no redirect URL",
				};
			}

			logger.info("SelectPlan: Success", {
				checkoutUrl: checkout.url,
				planId,
			});

			return { success: true, checkoutUrl: checkout.url, planId };
		},
		"selectPlan",
		{ success: false, error: "Failed to select plan" }
	);
}

export async function getCustomerPortalUrl() {
	return await withErrorHandling(
		async () => {
			const supabase = await getServerClient();

			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				throw new Error("Unauthorized");
			}

			// Get user's Polar customer ID
			const userData = await db.query.users.findFirst({
				where: eq(users.userId, user.id),
				columns: {
					polarCustomerId: true,
				},
			});

			if (userData?.polarCustomerId) {
				// Polar.sh customer portal URL
				return `https://polar.sh/${env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID}/portal`;
			}

			return null;
		},
		"getCustomerPortalUrl",
		null
	);
}

// moved PLAN_QUOTAS and UsageMetric to non-server config

// Main quota enforcement function
export async function checkQuotaAndConsume(
	userId: string,
	usageType: UsageMetric,
	amount = 1
): Promise<{
	allowed: boolean;
	remaining?: number;
	error?: string;
	quotaDetails?: {
		quotaType: UsageMetric;
		currentUsage: number;
		quotaLimit: number;
		planId: PlanId;
	};
}> {
	return await withErrorHandling(
		async () => {
			// Get user's current plan and usage in a transaction
			return await db.transaction(async (tx) => {
				// Get user's plan
				const userPlan = await tx.query.userPlans.findFirst({
					where: and(
						eq(userPlans.userId, userId),
						eq(userPlans.isActive, true)
					),
				});

				if (!userPlan) {
					return { allowed: false, error: "No active plan found" };
				}

				// Get or create user usage record
				let usage = await tx.query.userUsage.findFirst({
					where: eq(userUsage.userId, userId),
				});

				const now = new Date();
				// Fix: Reset cycle when current time is past the billing period end
				const shouldResetCycle =
					usage?.cycleStart &&
					userPlan.currentPeriodEnd &&
					now > new Date(userPlan.currentPeriodEnd);

				// Initialize usage or reset cycle if needed
				if (!usage) {
					[usage] = await tx
						.insert(userUsage)
						.values({
							userId,
							cycleStart: now,
						})
						.returning();
				} else if (shouldResetCycle && userPlan.currentPeriodEnd) {
					// Reset usage counters for new cycle
					[usage] = await tx
						.update(userUsage)
						.set({
							cycleStart: now,
							aiGenerationsCount: 0,
							aiTokensConsumed: 0,
							materialsUploadedCount: 0,
							updatedAt: now,
						})
						.where(eq(userUsage.userId, userId))
						.returning();
				}

				// Get quota limit for this plan
				const quota = PLAN_QUOTAS[userPlan.planId][usageType];

				// Map usage type to database field
				const fieldMapping: Record<UsageMetric, keyof typeof usage> = {
					ai_generations: "aiGenerationsCount",
					materials_uploaded: "materialsUploadedCount",
				};

				const fieldName = fieldMapping[usageType];
				const currentUsage = (usage[fieldName] as number) || 0;

				// Atomic conditional increment to prevent race conditions
				const newValue = currentUsage + amount;
				if (newValue > quota) {
					return {
						allowed: false,
						error: `${usageType} quota exceeded. You have used ${currentUsage}/${quota}. Please upgrade your plan.`,
						quotaDetails: {
							quotaType: usageType,
							currentUsage,
							quotaLimit: quota,
							planId: userPlan.planId,
						},
					};
				}

				const result = await tx
					.update(userUsage)
					.set({
						[fieldName]: newValue,
						updatedAt: now,
					})
					.where(eq(userUsage.userId, userId))
					.returning();

				// Defensive: ensure exactly one row updated
				if (result.length !== 1) {
					return { allowed: false, error: "Failed to update usage" };
				}

				return {
					allowed: true,
					remaining: quota - newValue,
				};
			});
		},
		"checkQuotaAndConsume",
		{ allowed: false, error: "Database error occurred" }
	);
}
