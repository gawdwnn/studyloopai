// Spaced Repetition Algorithms for Cuecard Sessions
// Implementation of SM-2 algorithm and difficulty adjustment

import { addDays, compareAsc } from "date-fns";
import type { CuecardFeedback, SpacedRepetitionCard } from "./types";

// SM-2 Algorithm constants
export const INITIAL_EASE_FACTOR = 2.5;
const MINIMUM_EASE_FACTOR = 1.3;
const INITIAL_INTERVAL = 1;
const SECOND_INTERVAL = 6;

/**
 * Update card difficulty and scheduling based on user feedback using SM-2 algorithm
 */
export function updateCardWithFeedback(
  card: SpacedRepetitionCard,
  feedback: CuecardFeedback,
  responseTime: number
): SpacedRepetitionCard {
  const now = new Date();
  let newEaseFactor = card.easeFactor;
  let newInterval = card.interval;
  let newDifficulty = card.difficulty;

  // Map feedback to quality score (0-5 scale for SM-2)
  let quality: number;
  switch (feedback) {
    case "too_easy":
      quality = 5;
      break;
    case "knew_some":
      quality = 3;
      break;
    case "incorrect":
      quality = 0;
      break;
  }

  // Update difficulty based on feedback and response time
  if (feedback === "too_easy") {
    newDifficulty = Math.max(0, card.difficulty - 1);
  } else if (feedback === "incorrect") {
    newDifficulty = Math.min(10, card.difficulty + 2);
  } else if (feedback === "knew_some") {
    // Adjust based on response time - slower response = higher difficulty
    const avgResponseTime = 3000; // 3 seconds baseline
    if (responseTime > avgResponseTime * 1.5) {
      newDifficulty = Math.min(10, card.difficulty + 0.5);
    } else if (responseTime < avgResponseTime * 0.5) {
      newDifficulty = Math.max(0, card.difficulty - 0.5);
    }
  }

  // Apply SM-2 algorithm
  if (quality >= 3) {
    // Correct response
    if (card.interval === 0) {
      newInterval = INITIAL_INTERVAL;
    } else if (card.interval === INITIAL_INTERVAL) {
      newInterval = SECOND_INTERVAL;
    } else {
      newInterval = Math.round(card.interval * newEaseFactor);
    }

    // Update ease factor
    newEaseFactor =
      newEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(MINIMUM_EASE_FACTOR, newEaseFactor);
  } else {
    // Incorrect response - reset interval
    newInterval = INITIAL_INTERVAL;
    // Don't modify ease factor for incorrect responses in basic SM-2
  }

  // Calculate next review date
  const nextReviewDate = addDays(now, newInterval);

  return {
    ...card,
    difficulty: newDifficulty,
    lastSeen: now,
    timesCorrect: card.timesCorrect + (quality >= 3 ? 1 : 0),
    timesIncorrect: card.timesIncorrect + (quality < 3 ? 1 : 0),
    easeFactor: newEaseFactor,
    interval: newInterval,
    nextReviewDate,
  };
}

/**
 * Sort cards by priority for optimal learning
 * Prioritizes cards that are due for review and user's weak areas
 */
export function sortCardsByPriority(
  cards: SpacedRepetitionCard[]
): SpacedRepetitionCard[] {
  const now = new Date();

  return [...cards].sort((a, b) => {
    // First priority: overdue cards
    const aOverdue = a.nextReviewDate <= now;
    const bOverdue = b.nextReviewDate <= now;

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Second priority: difficulty (harder cards first)
    if (aOverdue && bOverdue) {
      return b.difficulty - a.difficulty;
    }

    // Third priority: least recently seen
    return compareAsc(a.lastSeen, b.lastSeen);
  });
}

/**
 * Filter cards based on difficulty and focus preferences
 */
export function filterCardsByConfig(
  cards: SpacedRepetitionCard[],
  difficulty: "easy" | "medium" | "hard" | "mixed",
  focus: "tailored-for-me" | "weak-areas" | "recent-content" | "comprehensive",
  weeks: string[]
): SpacedRepetitionCard[] {
  let filtered = [...cards];

  // Filter by weeks
  if (weeks.length > 0 && !weeks.includes("all-weeks")) {
    filtered = filtered.filter((card) =>
      weeks.some((week) => card.week.toLowerCase().includes(week.toLowerCase()))
    );
  }

  // Filter by difficulty
  if (difficulty !== "mixed") {
    const difficultyRanges = {
      easy: [0, 3],
      medium: [3, 7],
      hard: [7, 10],
    };
    const [min, max] = difficultyRanges[difficulty];
    filtered = filtered.filter(
      (card) => card.difficulty >= min && card.difficulty < max
    );
  }

  // Apply focus strategy
  switch (focus) {
    case "weak-areas":
      // Prioritize cards with high difficulty or low success rate
      filtered.sort((a, b) => {
        const aSuccessRate =
          a.timesCorrect / (a.timesCorrect + a.timesIncorrect || 1);
        const bSuccessRate =
          b.timesCorrect / (b.timesCorrect + b.timesIncorrect || 1);
        return (
          b.difficulty +
          (1 - bSuccessRate) * 5 -
          (a.difficulty + (1 - aSuccessRate) * 5)
        );
      });
      break;

    case "recent-content":
      // Prioritize cards from later weeks
      filtered.sort((a, b) => b.week.localeCompare(a.week));
      break;

    case "tailored-for-me":
      // Use spaced repetition priority
      filtered = sortCardsByPriority(filtered);
      break;

    default:
      // Shuffle for variety
      filtered.sort(() => Math.random() - 0.5);
      break;
  }

  return filtered;
}

/**
 * Calculate optimal session length based on user performance
 */
export function calculateOptimalSessionLength(userPerformance: {
  averageTimePerCard: number;
  accuracy: number;
}): number {
  const baseSessionLength = 15; // minutes
  const maxSessionLength = 60; // minutes

  // Adjust based on accuracy - higher accuracy allows longer sessions
  const accuracyMultiplier = Math.max(0.5, userPerformance.accuracy / 100);

  // Adjust based on speed - faster users can handle more cards
  const speedMultiplier = Math.max(
    0.5,
    5000 / (userPerformance.averageTimePerCard || 5000)
  );

  const adjustedLength =
    baseSessionLength * accuracyMultiplier * speedMultiplier;

  return Math.min(maxSessionLength, Math.max(5, adjustedLength));
}

/**
 * Identify cards that user is struggling with
 */
export function identifyStrugglingCards(
  cards: SpacedRepetitionCard[],
  threshold = 0.3 // Success rate threshold
): SpacedRepetitionCard[] {
  return cards.filter((card) => {
    const totalAttempts = card.timesCorrect + card.timesIncorrect;
    if (totalAttempts < 3) return false; // Need enough data

    const successRate = card.timesCorrect / totalAttempts;
    return successRate < threshold || card.difficulty > 7;
  });
}

/**
 * Identify cards that user has mastered
 */
export function identifyMasteredCards(
  cards: SpacedRepetitionCard[],
  threshold = 0.9 // Success rate threshold
): SpacedRepetitionCard[] {
  return cards.filter((card) => {
    const totalAttempts = card.timesCorrect + card.timesIncorrect;
    if (totalAttempts < 5) return false; // Need enough data

    const successRate = card.timesCorrect / totalAttempts;
    return successRate >= threshold && card.difficulty < 3;
  });
}

/**
 * Generate review queue based on spaced repetition algorithm
 */
export function generateReviewQueue(cards: SpacedRepetitionCard[]): string[] {
  const now = new Date();

  // Get cards due for review
  const dueCards = cards.filter((card) => card.nextReviewDate <= now);

  // Sort by priority
  const sortedCards = sortCardsByPriority(dueCards);

  return sortedCards.map((card) => card.id);
}
