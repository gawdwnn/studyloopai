// Re-export store types for convenience
export type * from "@/stores/mcq-session/types";

// Component-specific types
export interface MCQConfig {
	courseId: string;
	weekIds: string[];
	difficulty?: "easy" | "medium" | "hard";
	questionCount?: number;
	shuffle?: boolean;
}

export interface MCQSessionProps {
	courses: Array<{ id: string; name: string }>;
	initialData?: {
		courseId: string;
		weekIds: string[];
		weeks: Array<{ id: string; name: string }>;
		mcqs: Array<{
			id: string;
			question: string;
			options: string[];
			correctAnswer: string;
			difficulty: string;
		}>;
		availability: {
			available: boolean;
			count: number;
			hasWeeksWithContent: boolean;
			availableWeeks: Array<{ id: string; weekNumber: number }>;
			mcqsByWeek: Record<string, number>;
			difficultyBreakdown: Record<string, number>;
		};
	} | null;
}
