"use client";

import {
	checkCuecardsAvailability,
	getUserCuecards,
	triggerCuecardsGeneration,
	updateCuecardProgress,
} from "@/lib/actions/cuecard";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type {
	CardResponse,
	CuecardConfig,
	CuecardFeedback,
	CuecardSessionStore,
	CuecardSetupConfig,
	SessionStats,
} from "./types";
import { initialCuecardState } from "./types";
import { useSessionManager } from "../session-manager/use-session-manager";

// Helper function to calculate raw session metrics for internal use
function calculateRawSessionMetrics(state: CuecardSessionStore): SessionStats {
	const tooEasy = state.responses.filter(
		(r) => r.feedback === "too_easy"
	).length;
	const knewSome = state.responses.filter(
		(r) => r.feedback === "knew_some"
	).length;
	const incorrect = state.responses.filter(
		(r) => r.feedback === "incorrect"
	).length;
	const totalTime = Date.now() - state.startTime.getTime();

	const totalResponses = state.responses.length;
	const correctResponses = tooEasy;
	const accuracy =
		totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0;

	return {
		totalCards: state.cards.length,
		tooEasy,
		knewSome,
		incorrect,
		totalTime,
		averageTimePerCard: totalResponses > 0 ? totalTime / totalResponses : 0,
		accuracy,
	};
}

const useCuecardSession = create<CuecardSessionStore>()(
	subscribeWithSelector(
		persist(
			(set, get) => ({
				...initialCuecardState,

				actions: {
					// Start a new session
					startSession: async (config: CuecardConfig) => {
						try {
							set({ isLoading: true, error: null, status: "loading" });

							const sessionId = `cuecard_${Date.now()}`;

							// Session manager integration (simplified)
							try {
								const sessionManager = useSessionManager.getState();
								await sessionManager.actions.startSession("cuecards", config);
							} catch (e) {
								console.warn(
									"Session manager failed to start, continuing...",
									e
								);
							}

							// Get cuecards from database
							const dbCuecards = await getUserCuecards(
								config.courseId,
								config.weeks
							);

							if (dbCuecards.length === 0) {
								const availability = await checkCuecardsAvailability(
									config.courseId
								);

								if (availability.hasWeeksWithContent) {
									set({
										isLoading: false,
										error:
											"No cuecards found for the selected weeks. Please try other weeks or generate new content.",
										status: "no_content_for_weeks",
									});
									return;
								}

								set({
									isLoading: false,
									error:
										"No cuecards found for this course. You can generate them from the setup screen.",
									status: "needs_generation",
								});
								return;
							}

							// Start session with cards
							set({
								id: sessionId,
								status: "active",
								config,
								cards: dbCuecards,
								currentIndex: 0,
								responses: [],
								startTime: new Date(),
								isLoading: false,
								error: null,
								cardStartTime: new Date(),
							});
						} catch (error) {
							console.error("Failed to start cuecard session:", error);
							const errorMessage =
								error instanceof Error
									? error.message
									: "An unknown error occurred";
							set({
								error: `Failed to start session: ${errorMessage}`,
								isLoading: false,
								status: "failed",
							});
						}
					},

					// End current session
					endSession: async () => {
						const state = get();
						if (state.status !== "active") return;

						try {
							const stats = calculateRawSessionMetrics(state);

							// Batch update progress
							const progressUpdates = state.responses.map((response) => ({
								cardId: response.cardId,
								status: "completed",
								score:
									response.feedback === "too_easy"
										? 100
										: response.feedback === "knew_some"
											? 70
											: 30,
								lastAttemptAt: response.attemptedAt,
							}));

							// We can batch these updates in a single server action if the API supports it
							await Promise.all(
								progressUpdates.map((update) =>
									updateCuecardProgress(update.cardId, {
										status: update.status as
											| "not_started"
											| "in_progress"
											| "completed",
										score: update.score,
										lastAttemptAt: update.lastAttemptAt,
									})
								)
							);

							// Session manager integration (simplified)
							try {
								const sessionManager = useSessionManager.getState();
								if (state.id) {
									await sessionManager.actions.endSession(state.id, {
										totalTime: Date.now() - state.startTime.getTime(),
										itemsCompleted: state.responses.length,
										accuracy: stats.accuracy,
									});
								}
							} catch (e) {
								console.warn("Session manager failed to end, continuing...", e);
							}

							set({ status: "completed", cardStartTime: null });
						} catch (error) {
							console.error("Failed to end cuecard session:", error);
							const errorMessage =
								error instanceof Error
									? error.message
									: "An unknown error occurred";
							set({
								error: `Failed to save session progress: ${errorMessage}`,
								status: "failed", // Or some other error state
							});
						}
					},

					// Reset session to initial state
					resetSession: () => {
						set(initialCuecardState);
					},

					// Setup configuration
					setSetupConfig: (config: Partial<CuecardSetupConfig>) => {
						set((state) => ({
							setupConfig: { ...state.setupConfig, ...config },
						}));
					},

					initSetupConfig: (
						courses: { id: string }[],
						initialParams: Partial<CuecardSetupConfig>
					) => {
						const currentConfig = get().setupConfig;
						const newConfig = { ...currentConfig, ...initialParams };

						if (!newConfig.courseId && courses.length > 0) {
							newConfig.courseId = courses[0].id;
						}
						set({ setupConfig: newConfig });
					},

					// Get current card
					getCurrentCard: () => {
						const state = get();
						if (
							state.status !== "active" ||
							state.currentIndex >= state.cards.length
						) {
							return null;
						}
						return state.cards[state.currentIndex];
					},

					// Submit feedback for current card
					submitFeedback: async (feedback: CuecardFeedback) => {
						const state = get();
						const currentCard = get().actions.getCurrentCard();

						if (!currentCard || !state.cardStartTime) return;

						// Record response with accurate time spent on the card
						const response: CardResponse = {
							cardId: currentCard.id,
							feedback,
							timeSpent: Date.now() - state.cardStartTime.getTime(),
							attemptedAt: new Date(),
						};

						const newResponses = [...state.responses, response];
						const nextIndex = state.currentIndex + 1;

						// Check if session is complete
						if (nextIndex >= state.cards.length) {
							set({ responses: newResponses });
							await get().actions.endSession();
						} else {
							// Move to next card and reset card start time
							set({
								responses: newResponses,
								currentIndex: nextIndex,
								cardStartTime: new Date(),
							});
						}
					},

					// Trigger content generation
					triggerGeneration: async (
						courseId: string,
						weekIds?: string[],
						generationConfig?: import(
							"@/types/generation-types"
						).SelectiveGenerationConfig
					) => {
						try {
							set({ isLoading: true, error: null, status: "generating" });

							const result = await triggerCuecardsGeneration(
								courseId,
								weekIds,
								generationConfig
							);

							if (result.success) {
								set({
									isLoading: false,
									status: "generating", // Keep this status until generation is confirmed complete
									error: null,
								});
								return true;
							}

							set({
								isLoading: false,
								error:
									result.message ||
									"An unknown error occurred during generation.",
								status: "failed",
							});
							return false;
						} catch (error) {
							console.error("Failed to trigger cuecard generation:", error);
							const errorMessage =
								error instanceof Error
									? error.message
									: "An unknown error occurred";
							set({
								isLoading: false,
								error: `Failed to trigger generation: ${errorMessage}`,
								status: "failed",
							});
							return false;
						}
					},

					// Error handling
					setError: (error: string | null) => {
						set({ error });
					},
				},
			}),
			{
				name: "cuecard-session",
				partialize: (state) => ({
					// Only persist minimal session recovery data
					id: state.id,
					status: state.status,
					config: state.config,
					setupConfig: state.setupConfig,
					// Persist these to allow recovery
					cards: state.status === "active" ? state.cards : [],
					currentIndex: state.status === "active" ? state.currentIndex : 0,
					responses: state.status === "active" ? state.responses : [],
					startTime: state.status === "active" ? state.startTime : null,
					cardStartTime: state.status === "active" ? state.cardStartTime : null,
				}),
			}
		)
	)
);

export { useCuecardSession };
export type { CuecardSessionStore };
