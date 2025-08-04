import { FEATURE_IDS, PLAN_IDS, type Plan } from "@/lib/database/types";

/**
 * UNIFIED PLAN CONFIGURATION - SINGLE SOURCE OF TRUTH
 *
 * This configuration contains the correct pricing as specified:
 * - Monthly: $4.99
 * - Yearly: $3.99 (per month, billed annually)
 */

export const PLANS: Plan[] = [
	{
		id: PLAN_IDS.FREE,
		name: "Free",
		price: 0,
		billingPeriod: "",
		description: "Perfect for trying out StudyLoop",
		features: [
			{
				id: FEATURE_IDS.BASIC_AI_TOOLS,
				name: "Basic AI-powered study tools",
				included: true,
			},
			{
				id: FEATURE_IDS.DOCUMENT_UPLOADS,
				name: "Up to 3 document uploads",
				included: true,
			},
			{
				id: FEATURE_IDS.AI_CHAT,
				name: "Limited AI chat (10 messages/day)",
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
		price: 4.99,
		billingPeriod: "/month",
		description: "Flexible monthly billing",
		savingsInfo: "Switch to yearly to save $1.00/month",
		features: [
			{
				id: FEATURE_IDS.BASIC_AI_TOOLS,
				name: "Everything in Free plan, plus:",
				included: true,
			},
			{
				id: FEATURE_IDS.UNLIMITED_UPLOADS,
				name: "Unlimited document uploads",
				included: true,
			},
			{
				id: FEATURE_IDS.AI_CHAT,
				name: "Unlimited AI chat & exercises",
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
		price: 3.99,
		billingPeriod: "/month",
		annualPrice: 47.88,
		description: "Best value • Annual billing",
		savingsInfo: "Save $1.00/month vs monthly plan",
		isPopular: true,
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
