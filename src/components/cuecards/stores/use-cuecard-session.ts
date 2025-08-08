"use client";

import { createGenerationHandlers } from "@/hooks/use-on-demand-generation";
import {
	addSessionResponse,
	completeSession,
	createOrUpdateLearningGap,
	createSessionOnly,
} from "@/lib/actions/adaptive-learning";
import type { UserCuecard } from "@/lib/actions/cuecard";
import { createLogger } from "@/lib/utils/logger";
import { createTimerActions } from "@/lib/utils/timer-mixin";
import { toast } from "sonner";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
	CardResponse,
	CuecardConfig,
	CuecardFeedback,
	CuecardSessionStore,
} from "./types";
import { initialCuecardState } from "./types";

const logger = createLogger("CuecardSession");

const useCuecardSession = create<CuecardSessionStore>()(
	subscribeWithSelector((set, get) => {
		return {
			...initialCuecardState,

			// Computed progress property for session progress indicator
			get progress() {
				const state = get();
				const correctAnswers = state.responses.filter(
					(r) => r.feedback === "correct"
				).length;
				const incorrectAnswers = state.responses.filter(
					(r) => r.feedback === "incorrect"
				).length;

				return {
					correctAnswers,
					incorrectAnswers,
					currentIndex: state.currentIndex,
					totalCards: state.cards.length,
					startedAt: state.startTime,
				};
			},

			actions: {
				// Timer actions from mixin
				...createTimerActions(set, get),
				// On-demand generation
				...createGenerationHandlers("cuecards", set, get),
				// Start session with pre-loaded data (optimized component-driven approach)
				startSession: async (
					config: CuecardConfig,
					preLoadedCards: UserCuecard[],
					useAdaptiveSelection = true
				) => {
					try {
						set({ isLoading: true, status: "loading" });

						const sessionId = `cuecard_${Date.now()}`;

						// Use pre-loaded data - no database fetch needed
						if (preLoadedCards.length === 0) {
							set({
								isLoading: false,
								status: "needs_generation",
							});
							return;
						}

						// ADAPTIVE LEARNING: Smart card selection and ordering
						let orderedCards = preLoadedCards;
						if (useAdaptiveSelection) {
							try {
								// Import smart selection service dynamically
								const { selectSmartCardSession } = await import(
									"@/lib/services/smart-card-selection"
								);

								// Use smart selection algorithm
								const selectionResult = await selectSmartCardSession({
									courseId: config.courseId || "",
									weekIds: config.weeks,
									maxCards: preLoadedCards.length,
									prioritizeGaps: true,
									includeNewCards: true,
								});

								if (selectionResult.cards.length > 0) {
									orderedCards = selectionResult.cards;
									logger.info(
										{
											gaps: selectionResult.metadata.gapCards,
											reviews: selectionResult.metadata.reviewCards,
											newCards: selectionResult.metadata.newCards,
											priority: selectionResult.metadata.priority,
											totalSelected: selectionResult.cards.length,
										},
										"Smart selection completed"
									);
								} else {
									// Fallback to original cards if smart selection returns empty
									orderedCards = preLoadedCards;
									logger.warn(
										{
											availableCards: preLoadedCards.length,
										},
										"Smart selection returned empty, using all cards"
									);
								}
							} catch (error) {
								logger.warn(
									{ error },
									"Smart card selection failed, falling back to randomization"
								);
								// Fallback to randomization if smart selection fails
								orderedCards = [...preLoadedCards].sort(
									() => Math.random() - 0.5
								);
							}
						}

						// Create session in database immediately for real-time persistence
						let realTimeSessionId: string | null = null;
						try {
							const dbSession = await createSessionOnly({
								contentType: "cuecard",
								sessionConfig: {
									courseId: config.courseId,
									weeks: config.weeks,
									sessionMode: "practice",
								},
								startedAt: new Date(),
							});
							realTimeSessionId = dbSession?.id || null;
							logger.info("Created real-time cuecard session", {
								sessionId: realTimeSessionId,
								dbSessionObject: dbSession,
							});
						} catch (dbError) {
							logger.warn(
								{ error: dbError },
								"Failed to create real-time session, continuing without persistence"
							);
						}

						// Start session immediately with ordered cards
						set({
							id: sessionId,
							status: "active",
							config,
							cards: orderedCards,
							currentIndex: 0,
							responses: [],
							startTime: new Date(),
							isLoading: false,
							cardStartTime: new Date(),
							realTimeSessionId, // Set immediately from database
						});

						// Initialize and start session timer
						get().actions.resetTimer();
						get().actions.startTimer();
						get().actions.startItem();
					} catch (error) {
						logger.error(
							{ error },
							"Failed to start cuecard session with data"
						);
						
						set({
							isLoading: false,
							status: "failed",
						});
					}
				},

				// session end with simplified completion
				endSession: async () => {
					const state = get();

					// Stop and capture final timer state
					get().actions.pauseTimer();
					const totalSessionTime = state.sessionElapsedTime;

					// Calculate final session stats
					const correct = state.responses.filter(
						(r) => r.feedback === "correct"
					).length;
					const totalResponses = state.responses.length;
					const accuracy = Math.round(
						totalResponses > 0 ? (correct / totalResponses) * 100 : 0
					);

					const sessionId: string | null = state.realTimeSessionId;

					// Try to save to database if session exists
					if (sessionId) {
						try {
							await completeSession({
								sessionId,
								totalTime: totalSessionTime,
								accuracy,
								completedAt: new Date(),
							});
						} catch (error) {
							// Log error but don't block session completion
							logger.error("Failed to save cuecard session to database", {
								error,
							});
						}
					}

					// Always complete the session
					set({
						status: "completed",
						cardStartTime: null,
						learningSessionId: sessionId,
					});

					logger.info({ sessionId: state.id }, "Cuecard session completed");

					return sessionId;
				},

				// Reset session to initial state
				resetSession: () => {
					set({
						...initialCuecardState,
						// Reset all state including generation tokens
						generationRunId: undefined,
						generationToken: undefined,
						learningSessionId: undefined,
						realTimeSessionId: null,
					});

					// Reset timer state
					get().actions.resetTimer();

					logger.info("Cuecard session reset");
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

					if (!currentCard) return;

					// Use timer action to finish current item and get accurate time
					const timeSpent = get().actions.finishItem();

					// Record response with accurate time spent on the card
					const response: CardResponse = {
						cardId: currentCard.id,
						feedback,
						timeSpent,
						attemptedAt: new Date(),
					};

					const newResponses = [...state.responses, response];
					const nextIndex = state.currentIndex + 1;

					// OPTIMISTIC UPDATE: Update UI immediately for responsive UX
					// Check if session is complete
					if (nextIndex >= state.cards.length) {
						// Update state first - optimistic update
						set({
							responses: newResponses,
							currentIndex: nextIndex, // Update index to prevent loop
							cardStartTime: null, // Clear card start time
						});
						// End session - this will set status to "completed" and return sessionId
						// Don't reset or navigate immediately - let the results view show
						await get().actions.endSession();
					} else {
						// Move to next card and start timer for next item - optimistic update
						set({
							responses: newResponses,
							currentIndex: nextIndex,
							cardStartTime: new Date(),
						});

						// Start timer for next card
						get().actions.startItem();
					}

					// Background operations - don't block UI
					// Track learning gaps for incorrect feedback
					if (feedback === "incorrect") {
						// Calculate severity based on response time
						const avgResponseTime = 30000; // 30 seconds baseline
						const timeFactor = timeSpent > avgResponseTime ? 1 : 2; // Struggled if took long time
						const severity = Math.min(10, 5 * timeFactor); // Base severity 5, increased if struggled

						// Async learning gap tracking - don't block the UI
						createOrUpdateLearningGap({
							contentType: "cuecard",
							contentId: currentCard.id,
							conceptId: undefined, // Cuecards don't have explicit topics
							severity,
						}).catch((error) => {
							logger.warn(
								{ error, cardId: currentCard.id },
								"Failed to track learning gap for cuecard"
							);
						});
					}

					// Save response to database in background - non-blocking
					if (state.realTimeSessionId) {
						const sessionId = state.realTimeSessionId;

						// Background database operation
						(async () => {
							try {
								const result = await addSessionResponse(sessionId, {
									contentId: response.cardId,
									responseData: {
										feedback: response.feedback,
										timeSpent: response.timeSpent,
									},
									responseTime: response.timeSpent,
									isCorrect: response.feedback === "correct",
									attemptedAt: response.attemptedAt,
								});

								if (!result) {
									throw new Error("Cuecard response not saved - null result");
								}

								logger.info("Cuecard response saved successfully", {
									responseId: result.id,
									cardId: response.cardId,
								});
							} catch (error) {
								logger.error(
									"Failed to save cuecard response to real-time session",
									{
										error,
										cardId: response.cardId,
										sessionId,
									}
								);

								// Only show error without blocking UI
								toast.error(
									"Failed to save your response. Your progress is stored locally."
								);
							}
						})(); // Immediately invoked async function
					}
				},
			},
		};
	})
);

// Export additional functions for store management
export const clearCuecardStorage = () => {
	// Reset store to initial state since persistence is removed
	useCuecardSession.getState().actions.resetSession();
};

export { useCuecardSession };
export type { CuecardSessionStore };
