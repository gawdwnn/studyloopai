export type PlanId = "free" | "yearly" | "monthly";

export interface PlanFeature {
	id: string;
	name: string;
	description?: string;
	included: boolean;
}

export interface Plan {
	id: PlanId;
	name: string;
	price: number;
	billingPeriod: string;
	description: string;
	savingsInfo?: string;
	isPopular?: boolean;
	features: PlanFeature[];
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
