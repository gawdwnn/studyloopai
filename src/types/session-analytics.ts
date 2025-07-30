// Types for session analytics - shared between client and server

export interface SessionAnalytics {
	session: {
		id: string;
		totalTime: number;
		itemsCompleted: number;
		accuracy: number;
		startedAt: Date;
		completedAt: Date;
		contentType: "cuecard" | "mcq" | "open_question";
	};
	responses: Array<{
		contentId: string;
		contentType: "cuecard" | "mcq" | "open_question";
		feedback: "correct" | "incorrect";
		timeSpent: number;
		attemptedAt: Date;
		question: string;
		responseData?: Record<string, unknown>; // Store type-specific response data
	}>;
	learningGaps: Array<{
		contentId: string;
		contentType: "cuecard" | "mcq" | "open_question";
		severity: number;
		failureCount: number;
		question: string;
	}>;
	schedulingData: Array<{
		contentId: string;
		contentType: "cuecard" | "mcq" | "open_question";
		nextReviewAt: Date;
		intervalDays: number;
		easeFactor: number;
		consecutiveCorrect: number;
		question: string;
	}>;
	performanceMetrics: {
		averageResponseTime: number;
		accuracyTrend: number;
		difficultyDistribution: Record<string, number>;
		improvementRate: number;
	};
}
