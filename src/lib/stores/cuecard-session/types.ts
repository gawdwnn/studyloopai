// Cuecard Session Store Types
// Focused on cuecard-specific functionality with strong typing

import type { BaseSessionConfig } from "../session-manager/types";

export type CuecardFeedback = "too_easy" | "knew_some" | "incorrect";

export type CuecardMode = "keywords" | "definitions" | "both";

export type DifficultyLevel = "easy" | "medium" | "hard" | "mixed";

export type FocusType =
  | "tailored-for-me"
  | "weak-areas"
  | "recent-content"
  | "comprehensive";

export type PracticeMode = "practice" | "exam";

export type SessionStatus =
  | "idle"
  | "active"
  | "paused"
  | "completed"
  | "failed";

// Cuecard-specific configuration
export interface CuecardConfig extends BaseSessionConfig {
  cardCount: number;
  mode: CuecardMode;
}

// Spaced repetition card with all necessary data
export interface SpacedRepetitionCard {
  id: string;
  keyword: string;
  definition: string;
  source: string;
  week: string;
  difficulty: number; // 0-10, higher means more difficult for user
  lastSeen: Date;
  timesCorrect: number;
  timesIncorrect: number;
  easeFactor: number; // SM-2 algorithm ease factor
  nextReviewDate: Date;
  interval: number; // Days until next review
}

// Progress tracking specific to cuecards
export interface CuecardProgress {
  currentIndex: number;
  totalCards: number;
  correctAnswers: number;
  incorrectAnswers: number;
  knewSomeAnswers: number;
  skippedCards: number;
  timeSpent: number; // milliseconds
  startedAt: Date;
  lastUpdated: Date;

  // Cuecard-specific metrics
  averageTimePerCard: number;
  reviewQueue: string[]; // card IDs in optimal review order
  masteredCards: string[]; // cards that no longer need frequent review
  strugglingCards: string[]; // cards user finds difficult
}

// Performance analytics for cuecards
export interface CuecardPerformance {
  accuracy: number; // percentage
  averageResponseTime: number; // milliseconds
  improvementRate: number; // how difficulty is decreasing over time
  retentionRate: number; // how well user remembers previously seen cards
  strongTopics: string[]; // topics user excels at
  weakTopics: string[]; // topics needing more practice
}

// Session state for cuecard sessions
export interface CuecardSessionState {
  id: string;
  status: SessionStatus;
  config: CuecardConfig;
  cards: SpacedRepetitionCard[];
  progress: CuecardProgress;
  performance: CuecardPerformance;
  currentCard: SpacedRepetitionCard | null;
  error: string | null;
  isLoading: boolean;
  lastSyncedAt: Date | null;
}

// Store actions interface
export interface CuecardSessionActions {
  // Session lifecycle
  startSession: (config: CuecardConfig) => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => Promise<void>;
  resetSession: () => void;

  // Card management
  getCurrentCard: () => SpacedRepetitionCard | null;
  moveToNextCard: () => void;
  moveToPreviousCard: () => void;
  skipCard: () => void;

  // Feedback and learning
  submitFeedback: (
    cardId: string,
    feedback: CuecardFeedback,
    timeSpent: number
  ) => void;

  // Progress tracking
  getSessionStats: () => {
    totalTime: number;
    cardsReviewed: number;
    accuracy: number;
    cardsRemaining: number;
  };

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Complete store interface
export interface CuecardSessionStore extends CuecardSessionState {
  actions: CuecardSessionActions;
}

// Initial state
export const initialCuecardProgress: CuecardProgress = {
  currentIndex: 0,
  totalCards: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  knewSomeAnswers: 0,
  skippedCards: 0,
  timeSpent: 0,
  startedAt: new Date(),
  lastUpdated: new Date(),
  averageTimePerCard: 0,
  reviewQueue: [],
  masteredCards: [],
  strugglingCards: [],
};

export const initialCuecardPerformance: CuecardPerformance = {
  accuracy: 0,
  averageResponseTime: 0,
  improvementRate: 0,
  retentionRate: 0.7, // Default assumption
  strongTopics: [],
  weakTopics: [],
};

export const initialCuecardState: CuecardSessionState = {
  id: "",
  status: "idle",
  config: {
    courseId: "",
    weeks: [],
    cardCount: 10,
    mode: "both",
    difficulty: "mixed",
    focus: "comprehensive",
    practiceMode: "practice",
  },
  cards: [],
  progress: initialCuecardProgress,
  performance: initialCuecardPerformance,
  currentCard: null,
  error: null,
  isLoading: false,
  lastSyncedAt: null,
};
