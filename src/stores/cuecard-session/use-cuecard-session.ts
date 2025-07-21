// Cuecard Session Store Implementation
// Dedicated store for cuecard learning sessions with spaced repetition

import { SAMPLE_CUECARDS } from "@/lib/data/sample-cuecards";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import {
	INITIAL_EASE_FACTOR,
	filterCardsByConfig,
	generateReviewQueue,
	identifyMasteredCards,
	identifyStrugglingCards,
	updateCardWithFeedback,
} from "./algorithms";
import type {
	CuecardConfig,
	CuecardFeedback,
	CuecardPerformance,
	CuecardProgress,
	CuecardSessionStore,
	SpacedRepetitionCard,
} from "./types";
import { initialCuecardState } from "./types";

// Convert sample data to SpacedRepetitionCard format
function convertToSpacedRepetitionCards(
	sampleCards: typeof SAMPLE_CUECARDS
): SpacedRepetitionCard[] {
	const now = new Date();

	return sampleCards.map((card) => ({
		...card,
		week: extractWeekFromSource(card.source),
		difficulty: 5, // Start with medium difficulty
		lastSeen: new Date(0), // Never seen before
		timesCorrect: 0,
		timesIncorrect: 0,
		easeFactor: INITIAL_EASE_FACTOR, // Default SM-2 ease factor
		nextReviewDate: now, // Available for immediate review
		interval: 0, // Not scheduled yet
	}));
}

function extractWeekFromSource(source: string): string {
	const weekMatch = source.match(/Week (\d+)/i);
	return weekMatch ? `Week ${weekMatch[1]}` : "Week 1";
}

const useCuecardSession = create<CuecardSessionStore>()(
	subscribeWithSelector(
		persist(
			(set, get) => ({
				...initialCuecardState,

				actions: {
					// Session lifecycle
					startSession: async (config: CuecardConfig) => {
						try {
							set({ isLoading: true, error: null });

							const sessionId = `cuecard_${Date.now()}`;
							const allCards = convertToSpacedRepetitionCards(SAMPLE_CUECARDS);

							// Filter and prepare cards based on config
							const filteredCards = filterCardsByConfig(
								allCards,
								config.difficulty,
								config.focus,
								config.weeks
							);

							// Limit to requested card count
							const sessionCards = filteredCards.slice(0, config.cardCount);

							if (sessionCards.length === 0) {
								throw new Error(
									"No cards found matching the specified criteria"
								);
							}

							// Initialize progress
							const reviewQueue = generateReviewQueue(sessionCards);
							const progress: CuecardProgress = {
								currentIndex: 0,
								totalCards: sessionCards.length,
								correctAnswers: 0,
								incorrectAnswers: 0,
								knewSomeAnswers: 0,
								skippedCards: 0,
								timeSpent: 0,
								startedAt: new Date(),
								lastUpdated: new Date(),
								averageTimePerCard: 0,
								reviewQueue: reviewQueue,
								masteredCards: [],
								strugglingCards: [],
							};

							// Initialize performance
							const performance: CuecardPerformance = {
								accuracy: 0,
								averageResponseTime: 0,
								improvementRate: 0,
								retentionRate: 0.7,
								strongTopics: [],
								weakTopics: [],
							};

							set({
								id: sessionId,
								status: "active",
								config,
								cards: sessionCards,
								progress,
								performance,
								currentCard:
									sessionCards.find((c) => c.id === reviewQueue[0]) || null,
								isLoading: false,
							});
						} catch (error) {
							set({
								error:
									error instanceof Error
										? error.message
										: "Failed to start session",
								isLoading: false,
								status: "failed",
							});
						}
					},

					pauseSession: () => {
						const state = get();
						if (state.status === "active") {
							set({ status: "paused" });
						}
					},

					resumeSession: () => {
						const state = get();
						if (state.status === "paused") {
							set({ status: "active" });
						}
					},

					endSession: async () => {
						const state = get();
						try {
							set({
								status: "completed",
								progress: {
									...state.progress,
									lastUpdated: new Date(),
								},
							});
						} catch (error) {
							set({
								error:
									error instanceof Error
										? error.message
										: "Failed to end session",
								status: "failed",
							});
						}
					},

					resetSession: () => {
						set(initialCuecardState);
					},

					// Card management
					getCurrentCard: () => {
						const state = get();
						return state.currentCard;
					},

					moveToNextCard: () => {
						const state = get();
						const nextIndex = state.progress.currentIndex + 1;

						if (nextIndex < state.cards.length) {
							set({
								progress: {
									...state.progress,
									currentIndex: nextIndex,
									lastUpdated: new Date(),
								},
								currentCard: state.cards[nextIndex],
							});
						} else {
							// Session completed
							get().actions.endSession();
						}
					},

					moveToPreviousCard: () => {
						const state = get();
						const prevIndex = Math.max(0, state.progress.currentIndex - 1);

						set({
							progress: {
								...state.progress,
								currentIndex: prevIndex,
								lastUpdated: new Date(),
							},
							currentCard: state.cards[prevIndex],
						});
					},

					skipCard: () => {
						const state = get();

						set({
							progress: {
								...state.progress,
								skippedCards: state.progress.skippedCards + 1,
								lastUpdated: new Date(),
							},
						});

						get().actions.moveToNextCard();
					},

					// Feedback and learning
					submitFeedback: (
						cardId: string,
						feedback: CuecardFeedback,
						timeSpent: number
					) => {
						const state = get();
						const cardIndex = state.cards.findIndex(
							(card) => card.id === cardId
						);

						if (cardIndex === -1) return;

						// Update card with spaced repetition algorithm
						const updatedCard = updateCardWithFeedback(
							state.cards[cardIndex],
							feedback,
							timeSpent
						);

						// Update cards array
						const updatedCards = [...state.cards];
						updatedCards[cardIndex] = updatedCard;

						// Update progress
						const isCorrect = feedback === "too_easy";
						const isPartial = feedback === "knew_some";

						const updatedProgress: CuecardProgress = {
							...state.progress,
							correctAnswers:
								state.progress.correctAnswers + (isCorrect ? 1 : 0),
							incorrectAnswers:
								state.progress.incorrectAnswers +
								(!isCorrect && !isPartial ? 1 : 0),
							knewSomeAnswers:
								state.progress.knewSomeAnswers + (isPartial ? 1 : 0),
							timeSpent: state.progress.timeSpent + timeSpent,
							lastUpdated: new Date(),
							averageTimePerCard:
								(state.progress.timeSpent + timeSpent) /
								(state.progress.currentIndex + 1),
							masteredCards: identifyMasteredCards(updatedCards).map(
								(card) => card.id
							),
							strugglingCards: identifyStrugglingCards(updatedCards).map(
								(card) => card.id
							),
						};

						set({
							cards: updatedCards,
							progress: updatedProgress,
						});

						// Move to next card
						get().actions.moveToNextCard();
					},

					// Progress tracking
					getSessionStats: () => {
						const state = get();
						const cardsReviewed = state.progress.currentIndex;
						const cardsRemaining = state.progress.totalCards - cardsReviewed;
						const totalAttempts =
							state.progress.correctAnswers + state.progress.incorrectAnswers;
						const accuracy =
							totalAttempts > 0
								? (state.progress.correctAnswers / totalAttempts) * 100
								: 0;

						return {
							totalTime: state.progress.timeSpent,
							cardsReviewed,
							accuracy,
							cardsRemaining,
						};
					},

					// Error handling
					setError: (error: string | null) => {
						set({ error });
					},

					clearError: () => {
						set({ error: null });
					},
				},
			}),
			{
				name: "cuecard-session-store",
				version: 1,
				partialize: (state) => ({
					id: state.id,
					status: state.status,
					config: state.config,
					cards: state.cards,
					progress: state.progress,
					performance: state.performance,
					currentCard: state.currentCard,
					lastSyncedAt: state.lastSyncedAt,
				}),
			}
		)
	)
);

export { useCuecardSession };
export type { CuecardSessionStore };
