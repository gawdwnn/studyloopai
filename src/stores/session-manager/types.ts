// Session Manager Types
// Coordinates and manages multiple session types

import type { SelectiveGenerationConfig } from "@/types/generation-types";
import type { SessionStatus } from "../cuecard-session/types";

export type SessionType = "cuecards" | "multiple-choice" | "open-questions";

export type { SessionStatus };

// Callback interface for child stores to register with Session Manager
export interface SessionCallbacks {
	onStart?: (sessionId: string, config: BaseSessionConfig) => void;
	onEnd?: (sessionId: string, stats: SessionHistoryEntry["finalStats"]) => void;
	onProgress?: (
		sessionId: string,
		progress: ActiveSessionInfo["progress"]
	) => void;
}

// Common configuration interface for all session types
export interface BaseSessionConfig {
	courseId: string;
	weeks: string[];
}

// Session history and tracking
export interface SessionHistoryEntry {
	id: string;
	type: SessionType;
	courseId: string;
	startedAt: Date;
	completedAt: Date | null;
	status: SessionStatus;
	config: BaseSessionConfig;
	finalStats: {
		totalTime: number;
		itemsCompleted: number;
		accuracy: number;
		score?: number;
	};
	performance: {
		strengths: string[];
		weaknesses: string[];
		recommendations: string[];
	};
}

// Cross-session analytics
export interface CrossSessionAnalytics {
	totalSessions: number;
	totalTimeSpent: number; // milliseconds
	averageSessionLength: number; // minutes

	// Performance by session type
	sessionTypeBreakdown: Record<
		SessionType,
		{
			count: number;
			averageAccuracy: number;
			averageScore: number;
			totalTime: number;
		}
	>;

	// Learning patterns
	learningPatterns: {
		mostProductiveTimeOfDay: number; // hour 0-23
		preferredSessionLength: number; // minutes
		strongestTopics: string[];
		weakestTopics: string[];
		improvementTrend: number; // positive = improving
	};

	// Goals and streaks
	goals: {
		dailySessionTarget: number;
		currentStreak: number;
		longestStreak: number;
		weeklyProgress: number; // 0-1 percentage
	};
}

// Session recommendations
export interface SessionRecommendation {
	type: SessionType;
	reason: string;
	config: BaseSessionConfig;
	estimatedDuration: number; // minutes
	priority: "high" | "medium" | "low";
	benefits: string[];
}

// Active session tracking (for coordination)
export interface ActiveSessionInfo {
	id: string;
	type: SessionType;
	startedAt: Date;
	lastActivityAt: Date;
	status: "active" | "paused" | "completed" | "failed";
	config: BaseSessionConfig;
	progress: {
		currentIndex: number;
		totalItems: number;
		completionPercentage: number;
	};
}

// Session manager state
export interface SessionManagerState {
	// Current active session (only one at a time)
	activeSession: ActiveSessionInfo | null;

	// Session history
	sessionHistory: SessionHistoryEntry[];

	// Analytics and insights
	analytics: CrossSessionAnalytics;

	// Recommendations
	recommendations: SessionRecommendation[];

	// User preferences
	preferences: {
		defaultSessionLength: number; // minutes
		preferredSessionTypes: SessionType[];
		autoSaveInterval: number; // minutes
		reminderSettings: {
			enabled: boolean;
			dailyGoal: number; // sessions per day
			reminderTimes: string[]; // HH:MM format
		};
	};

	// State flags
	isLoadingAnalytics: boolean;
	isGeneratingRecommendations: boolean;
	error: string | null;
	lastSyncedAt: Date | null;
}

// Session manager actions
export interface SessionManagerActions {
	// Callback registration API
	registerSessionCallbacks: (
		sessionType: SessionType,
		callbacks: SessionCallbacks
	) => () => void; // Returns unregister function

	// Session coordination
	startSession: (
		type: SessionType,
		config: BaseSessionConfig
	) => Promise<string>;
	endSession: (
		sessionId: string,
		finalStats: SessionHistoryEntry["finalStats"]
	) => Promise<void>;
	pauseSession: (sessionId: string) => void;
	resumeSession: (sessionId: string) => void;
	switchSessionType: (newType: SessionType) => Promise<void>;
	recoverSession: () => Promise<ActiveSessionInfo | null>;

	// Session history
	getSessionHistory: (filter?: {
		type?: SessionType;
		dateRange?: { start: Date; end: Date };
	}) => SessionHistoryEntry[];
	getSessionById: (sessionId: string) => SessionHistoryEntry | null;
	deleteSession: (sessionId: string) => void;

	// Analytics
	calculateAnalytics: () => Promise<CrossSessionAnalytics>;

	// Recommendations
	generateRecommendations: () => Promise<SessionRecommendation[]>;

	// Synchronization - Session Metadata Only
	syncSessionMetadata: () => Promise<{ success: boolean; message: string }>;
	syncAllSessionData: () => Promise<{
		success: boolean;
		message: string;
		results: Array<{
			store: string;
			result: { success: boolean; message: string };
		}>;
	}>;

	// Preferences
	updatePreferences: (
		preferences: Partial<SessionManagerState["preferences"]>
	) => void;
	getPreferences: () => SessionManagerState["preferences"];

	// Progress tracking
	updateSessionProgress: (
		sessionId: string,
		progress: ActiveSessionInfo["progress"]
	) => void;
	getActiveSessionInfo: () => ActiveSessionInfo | null;

	// Goal management
	setDailyGoal: (sessions: number) => void;
	checkGoalProgress: () => {
		completed: number;
		target: number;
		percentage: number;
	};

	// Generation config inference
	inferGenerationConfig: (
		courseId: string,
		sessionType: SessionType
	) => Promise<SelectiveGenerationConfig | null>;
	// Error handling
	setError: (error: string | null) => void;
	clearError: () => void;

	// Hydration
	hydrate: (initialState: {
		history?: SessionHistoryEntry[];
		analytics?: CrossSessionAnalytics;
		preferences?: SessionManagerState["preferences"];
	}) => void;
}

// Complete store interface
export interface SessionManagerStore extends SessionManagerState {
	actions: SessionManagerActions;
}

// Initial state
export const initialCrossSessionAnalytics: CrossSessionAnalytics = {
	totalSessions: 0,
	totalTimeSpent: 0,
	averageSessionLength: 0,
	sessionTypeBreakdown: {
		cuecards: {
			count: 0,
			averageAccuracy: 0,
			averageScore: 0,
			totalTime: 0,
		},
		"multiple-choice": {
			count: 0,
			averageAccuracy: 0,
			averageScore: 0,
			totalTime: 0,
		},
		"open-questions": {
			count: 0,
			averageAccuracy: 0,
			averageScore: 0,
			totalTime: 0,
		},
	},
	learningPatterns: {
		mostProductiveTimeOfDay: 14, // 2 PM default
		preferredSessionLength: 20, // 20 minutes default
		strongestTopics: [],
		weakestTopics: [],
		improvementTrend: 0,
	},
	goals: {
		dailySessionTarget: 1,
		currentStreak: 0,
		longestStreak: 0,
		weeklyProgress: 0,
	},
};

export const initialSessionManagerState: SessionManagerState = {
	activeSession: null,
	sessionHistory: [],
	analytics: initialCrossSessionAnalytics,
	recommendations: [],
	preferences: {
		defaultSessionLength: 20,
		preferredSessionTypes: ["cuecards", "multiple-choice", "open-questions"],
		autoSaveInterval: 5,
		reminderSettings: {
			enabled: false,
			dailyGoal: 1,
			reminderTimes: ["09:00", "18:00"],
		},
	},
	isLoadingAnalytics: false,
	isGeneratingRecommendations: false,
	error: null,
	lastSyncedAt: null,
};
