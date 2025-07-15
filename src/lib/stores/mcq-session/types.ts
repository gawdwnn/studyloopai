// MCQ Session Store Types
// Focused on multiple choice question functionality with strong typing

export type DifficultyLevel = "easy" | "medium" | "hard" | "mixed";

export type FocusType = "tailored-for-me" | "weak-areas" | "recent-content" | "comprehensive";

export type SessionStatus = "idle" | "active" | "paused" | "completed" | "failed";

export type PracticeMode = "practice" | "exam";

// MCQ-specific configuration
export interface McqConfig {
	courseId: string;
	weeks: string[];
	numQuestions: number;
	difficulty: DifficultyLevel;
	focus: FocusType;
	practiceMode: PracticeMode;
	timeLimit?: number;
	randomizeOptions?: boolean;
}

export interface McqQuestion {
	id: string;
	question: string;
	options: string[];
	correctAnswer: string;
	explanation?: string;
	difficulty: "easy" | "medium" | "hard";
	source: string;
	week: string;
	topic?: string;
	timesSeen: number;
	timesCorrect: number;
	timesIncorrect: number;
	averageResponseTime: number;
}

export interface McqAnswer {
	questionId: string;
	selectedAnswer: string | null;
	isCorrect: boolean;
	timeSpent: number; // milliseconds
	confidenceLevel: number; // 1-5 scale
	timestamp: Date;
}

export interface McqProgress {
	currentIndex: number;
	totalQuestions: number;
	correctAnswers: number;
	incorrectAnswers: number;
	skippedQuestions: number;
	timeSpent: number; // milliseconds
	startedAt: Date;
	lastUpdated: Date;
	averageTimePerQuestion: number;
	answers: McqAnswer[];
	flaggedQuestions: string[]; // questions marked for review
	remainingTime?: number; // for timed sessions
}

// Performance analytics for MCQ sessions
export interface McqPerformance {
	accuracy: number; // percentage
	averageResponseTime: number; // milliseconds
	difficultyBreakdown: Record<
		"easy" | "medium" | "hard",
		{
			attempted: number;
			correct: number;
			accuracy: number;
		}
	>;
	topicBreakdown: Record<
		string,
		{
			attempted: number;
			correct: number;
			accuracy: number;
		}
	>;
	timeEfficiency: number; // questions per minute
	confidenceAccuracy: number; // correlation between confidence and correctness
	improvementTrend: number; // accuracy trend over time
}

// Session state for MCQ sessions
export interface McqSessionState {
	id: string;
	status: SessionStatus;
	config: McqConfig;
	questions: McqQuestion[];
	progress: McqProgress;
	performance: McqPerformance;
	currentQuestion: McqQuestion | null;
	shuffledOptions?: string[]; // for current question if randomization is enabled
	error: string | null;
	isLoading: boolean;
	lastSyncedAt: Date | null;
}

// Store actions interface
export interface McqSessionActions {
	// Session lifecycle
	startSession: (config: McqConfig) => Promise<void>;
	pauseSession: () => void;
	resumeSession: () => void;
	endSession: () => Promise<void>;
	resetSession: () => void;

	// Question management
	getCurrentQuestion: () => McqQuestion | null;
	moveToNextQuestion: () => void;
	moveToPreviousQuestion: () => void;
	jumpToQuestion: (index: number) => void;
	flagQuestion: (questionId: string) => void;
	unflagQuestion: (questionId: string) => void;

	// Answer submission
	submitAnswer: (
		questionId: string,
		selectedAnswer: string | null,
		timeSpent: number,
		confidenceLevel?: number
	) => void;
	changeAnswer: (questionId: string, newAnswer: string | null) => void;
	skipQuestion: () => void;

	// Progress tracking
	calculateProgress: () => McqProgress;
	calculatePerformance: () => McqPerformance;
	getSessionStats: () => {
		totalTime: number;
		questionsAnswered: number;
		accuracy: number;
		questionsRemaining: number;
		averageTimePerQuestion: number;
	};

	// Review and navigation
	getAnsweredQuestions: () => McqAnswer[];
	getUnansweredQuestions: () => McqQuestion[];
	getFlaggedQuestions: () => McqQuestion[];
	getIncorrectAnswers: () => McqAnswer[];

	// Error handling
	setError: (error: string | null) => void;
	clearError: () => void;
}

// Complete store interface
export interface McqSessionStore extends McqSessionState {
	actions: McqSessionActions;
}

// Initial state
export const initialMcqProgress: McqProgress = {
	currentIndex: 0,
	totalQuestions: 0,
	correctAnswers: 0,
	incorrectAnswers: 0,
	skippedQuestions: 0,
	timeSpent: 0,
	startedAt: new Date(),
	lastUpdated: new Date(),
	averageTimePerQuestion: 0,
	answers: [],
	flaggedQuestions: [],
};

export const initialMcqPerformance: McqPerformance = {
	accuracy: 0,
	averageResponseTime: 0,
	difficultyBreakdown: {
		easy: { attempted: 0, correct: 0, accuracy: 0 },
		medium: { attempted: 0, correct: 0, accuracy: 0 },
		hard: { attempted: 0, correct: 0, accuracy: 0 },
	},
	topicBreakdown: {},
	timeEfficiency: 0,
	confidenceAccuracy: 0,
	improvementTrend: 0,
};

export const initialMcqState: McqSessionState = {
	id: "",
	status: "idle",
	config: {
		courseId: "",
		weeks: [],
		numQuestions: 10,
		difficulty: "mixed",
		focus: "comprehensive",
		practiceMode: "practice",
		randomizeOptions: true,
	},
	questions: [],
	progress: initialMcqProgress,
	performance: initialMcqPerformance,
	currentQuestion: null,
	shuffledOptions: undefined,
	error: null,
	isLoading: false,
	lastSyncedAt: null,
};
