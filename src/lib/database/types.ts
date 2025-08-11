export type PlanId = "free" | "yearly" | "monthly";

// Plan IDs for easy reference and type safety
export const PLAN_IDS = {
	FREE: "free" as const,
	MONTHLY: "monthly" as const,
	YEARLY: "yearly" as const,
} as const;

export interface PlanFeature {
	id: string;
	name: string;
	description?: string;
	included: boolean;
}

export interface PlanQuotas {
	ai_generations: number;
	materials_uploaded: number;
}

export type UsageMetric = keyof PlanQuotas;

export interface Plan {
	id: PlanId;
	name: string;
	price: number;
	billingPeriod: string;
	annualPrice?: number;
	description: string;
	savingsInfo?: string;
	isPopular?: boolean;
	features: PlanFeature[];
	quotas: PlanQuotas;
}

// Feature IDs for easy reference and type safety
export const FEATURE_IDS = {
	BASIC_AI_TOOLS: "basic_ai_tools",
	DOCUMENT_UPLOADS: "document_uploads",
	AI_CHAT: "ai_chat",
	NOTE_GENERATION: "note_generation",
	SUPPORT: "support",
	ADVANCED_AI: "advanced_ai",
	UNLIMITED_UPLOADS: "unlimited_uploads",
	PRIORITY_SUPPORT: "priority_support",
	EARLY_ACCESS: "early_access",
	ANALYTICS: "analytics",
} as const;

export type FeatureId = keyof typeof FEATURE_IDS;
