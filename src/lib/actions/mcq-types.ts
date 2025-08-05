"use server";

// Focused, single-purpose types for MCQ functionality

export type UserMCQ = {
	id: string;
	courseId: string;
	weekId: string;
	question: string;
	options: string[];
	correctAnswer: string;
	explanation: string | null;
	difficulty: string | null;
	metadata: unknown;
	createdAt: Date | null;
	updatedAt: Date | null;
	weekNumber: number;
};

// Clear separation: Session data for UI components
export interface MCQSessionData {
	courseId: string;
	weeks: WeekMCQInfo[];
	summary: MCQSummary;
	capability: GenerationCapability;
}

export interface WeekMCQInfo {
	id: string;
	title: string;
	weekNumber: number;
	mcqCount: number;
	hasExistingMCQs: boolean;
}

export interface MCQSummary {
	totalMCQs: number;
	totalWeeks: number;
	weeksWithMCQs: number;
}

// Separate concern: Generation capability
export interface GenerationCapability {
	canGenerate: boolean;
	hasConfiguredWeeks: boolean;
	eligibleWeeks: string[]; // Week IDs that can generate MCQs
	reason?: "no_materials" | "no_config" | "all_generated" | "ready";
}

// For backward compatibility during migration
export interface LegacyMCQAvailability {
	available: boolean;
	count: number;
	hasCourseWeeksWithContent: boolean;
	availableWeeks: Array<{ id: string; weekNumber: number }>;
	mcqsByWeek: Record<string, number>;
	difficultyBreakdown: Record<string, number>;
}

// Filters for queries
export interface MCQFilters {
	courseId?: string;
	weekIds?: string[];
	difficulty?: string;
	limit?: number;
}
