import {
	FEATURE_IDS,
	PLAN_IDS,
	type Plan,
	type UsageMetric,
} from "@/lib/database/types";

// Re-export UsageMetric for backward compatibility
export type { UsageMetric };

/**
 * UNIFIED PLAN CONFIGURATION - SINGLE SOURCE OF TRUTH
 *
 * This configuration contains the correct pricing as specified:
 * - Monthly: $20.00
 * - Yearly: $17.00 (per month, billed annually at $204)
 */

export const PLANS: Plan[] = [
	{
		id: PLAN_IDS.FREE,
		name: "Free",
		price: 0,
		billingPeriod: "",
		description: "Perfect for trying out StudyLoop",
		quotas: {
			ai_generations: 25,
			materials_uploaded: 5,
		},
		features: [
			{
				id: FEATURE_IDS.BASIC_AI_TOOLS,
				name: "Basic AI-powered study tools",
				included: true,
			},
			{
				id: FEATURE_IDS.DOCUMENT_UPLOADS,
				name: "5 document uploads per month",
				included: true,
			},
			{
				id: FEATURE_IDS.AI_CHAT,
				name: "25 AI generations per month",
				included: true,
			},
			{
				id: FEATURE_IDS.NOTE_GENERATION,
				name: "Basic note generation",
				included: true,
			},
			{
				id: FEATURE_IDS.SUPPORT,
				name: "Community support",
				included: true,
			},
			{
				id: FEATURE_IDS.ADVANCED_AI,
				name: "Advanced AI features",
				included: false,
			},
			{
				id: FEATURE_IDS.UNLIMITED_UPLOADS,
				name: "Unlimited uploads & exercises",
				included: false,
			},
		],
	},
	{
		id: PLAN_IDS.MONTHLY,
		name: "Pro",
		price: 20,
		billingPeriod: "/month",
		description: "Flexible monthly billing",
		savingsInfo: "Switch to yearly to save $3.00/month",
		quotas: {
			ai_generations: 500,
			materials_uploaded: 100,
		},
		features: [
			{
				id: FEATURE_IDS.BASIC_AI_TOOLS,
				name: "Everything in Free plan, plus:",
				included: true,
			},
			{
				id: FEATURE_IDS.UNLIMITED_UPLOADS,
				name: "100 document uploads per month",
				included: true,
			},
			{
				id: FEATURE_IDS.AI_CHAT,
				name: "500 AI generations per month",
				included: true,
			},
			{
				id: FEATURE_IDS.NOTE_GENERATION,
				name: "Advanced note generation",
				included: true,
			},
			{
				id: FEATURE_IDS.PRIORITY_SUPPORT,
				name: "Priority support",
				included: true,
			},
		],
	},
	{
		id: PLAN_IDS.YEARLY,
		name: "Pro",
		price: 17,
		billingPeriod: "/month",
		annualPrice: 204,
		description: "Best value • Annual billing",
		savingsInfo: "Save $3.00/month vs monthly plan",
		isPopular: true,
		quotas: {
			ai_generations: 500,
			materials_uploaded: 100,
		},
		features: [
			{
				id: FEATURE_IDS.BASIC_AI_TOOLS,
				name: "Everything in Monthly plan, plus:",
				included: true,
			},
			{
				id: FEATURE_IDS.EARLY_ACCESS,
				name: "Early access to new features",
				included: true,
			},
			{
				id: FEATURE_IDS.ANALYTICS,
				name: "Study analytics & insights",
				included: true,
			},
		],
	},
];

// Create quota lookup similar to PLAN_QUOTAS for backward compatibility
export const PLAN_QUOTAS = PLANS.reduce(
	(acc, plan) => {
		acc[plan.id] = plan.quotas;
		return acc;
	},
	{} as Record<string, { ai_generations: number; materials_uploaded: number }>
);

// Utility functions for price conversion
export const priceUtils = {
	/**
	 * Convert dollars to cents for Polar API
	 */
	toCents: (dollars: number): number => Math.round(dollars * 100),

	/**
	 * Convert cents to dollars for display
	 */
	toDollars: (cents: number): number => cents / 100,

	/**
	 * Format price for display
	 */
	formatDisplay: (dollars: number, interval?: string): string => {
		return interval
			? `$${dollars.toFixed(2)}/${interval}`
			: `$${dollars.toFixed(2)}`;
	},

	/**
	 * Convert plan to Polar API format
	 */
	toPolarFormat: (plan: Plan) => ({
		amountType: "fixed" as const,
		priceAmount: Math.round(plan.price * 100), // Convert to cents
		priceCurrency: "usd",
	}),
};
