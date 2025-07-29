"use client";

import { type UserCuecard, updateCuecardProgress } from "@/lib/actions/cuecard";
import { triggerOnDemandGeneration } from "@/lib/services/on-demand-generation-service";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { useSessionManager } from "../session-manager/use-session-manager";
import type {
	CardResponse,
	CuecardConfig,
	CuecardFeedback,
	CuecardSessionStore,
	CuecardSetupConfig,
	SessionStats,
} from "./types";
import { initialCuecardState } from "./types";

// Helper function to calculate raw session metrics for internal use
function calculateRawSessionMetrics(state: CuecardSessionStore): SessionStats {
	const correct = state.responses.filter(
		(r) => r.feedback === "correct"
	).length;
	const incorrect = state.responses.filter(
		(r) => r.feedback === "incorrect"
	).length;
	const totalTime = state.startTime
		? Date.now() - state.startTime.getTime()
		: 0;

	const totalResponses = state.responses.length;
	const accuracy = totalResponses > 0 ? (correct / totalResponses) * 100 : 0;

	return {
		totalCards: state.cards.length,
		correct,
		incorrect,
		totalTime,
		averageTimePerCard: totalResponses > 0 ? totalTime / totalResponses : 0,
		accuracy,
	};
}

const useCuecardSession = create<CuecardSessionStore>()(
	subscribeWithSelector(
		persist(
			(set, get) => {
				// Initialize callback registration with Session Manager
				try {
					const sessionManager = useSessionManager.getState();
					sessionManager.actions.registerSessionCallbacks("cuecards", {
						onStart: (_sessionId) => {
							// Session Manager handles coordination, no action needed here
							// Callback confirms session started successfully
						},
						onEnd: (_sessionId, _stats) => {
							// Session Manager handles analytics, no action needed here
							// Callback confirms session ended and stats were recorded
						},
						onProgress: (_sessionId, _progress) => {
							// Session Manager handles progress tracking, no action needed here
							// Callback confirms progress was updated
						},
					});
				} catch (error) {
					console.warn(
						"Failed to register callbacks with Session Manager:",
						error
					);
				}

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
						// Start session with pre-loaded data (optimized component-driven approach)
						startSessionWithData: async (
							config: CuecardConfig,
							preLoadedCards: UserCuecard[]
						) => {
							try {
								set({ isLoading: true, error: null, status: "loading" });

								const sessionId = `cuecard_${Date.now()}`;

								// Session manager integration
								try {
									const sessionManager = useSessionManager.getState();
									await sessionManager.actions.startSession("cuecards", config);
								} catch (e) {
									console.warn(
										"Session manager failed to start, continuing...",
										e
									);
								}

								// Use pre-loaded data - no database fetch needed
								if (preLoadedCards.length === 0) {
									set({
										isLoading: false,
										error: "No cuecards available for session",
										status: "needs_generation",
									});
									return;
								}

								// Start session immediately with pre-loaded cards
								set({
									id: sessionId,
									status: "active",
									config,
									cards: preLoadedCards,
									currentIndex: 0,
									responses: [],
									startTime: new Date(),
									isLoading: false,
									error: null,
									cardStartTime: new Date(),
								});
							} catch (error) {
								console.error(
									"Failed to start cuecard session with data:",
									error
								);
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

						// Enhanced session end with adaptive learning integration
						endSession: async () => {
							const state = get();
							if (state.status !== "active") return;

							try {
								const stats = calculateRawSessionMetrics(state);

								// TODO: ADAPTIVE LEARNING - Record session data in learningSessions table
								// const sessionRecord = await createLearningSession({
								//   userId: user.id,
								//   contentType: 'cuecard',
								//   sessionConfig: { courseId: state.config.courseId, weeks: state.config.weeks },
								//   totalTime: stats.totalTime,
								//   itemsCompleted: stats.totalCards,
								//   accuracy: stats.accuracy,
								//   startedAt: state.startTime!,
								//   completedAt: new Date()
								// });

								// TODO: ADAPTIVE LEARNING - Record detailed responses in sessionResponses table
								// await createSessionResponses(sessionRecord.id, state.responses.map(response => ({
								//   contentId: response.cardId,
								//   responseData: { feedback: response.feedback, timeSpent: response.timeSpent },
								//   responseTime: response.timeSpent,
								//   isCorrect: response.feedback === 'correct',
								//   attemptedAt: response.attemptedAt
								// })));

								// TODO: ADAPTIVE LEARNING - Update spaced repetition scheduling in cuecardScheduling table
								// for (const response of state.responses) {
								//   await updateCuecardScheduling(response.cardId, {
								//     lastReviewedAt: response.attemptedAt,
								//     reviewCount: existing.reviewCount + 1,
								//     consecutiveCorrect: response.feedback === 'correct' ? existing.consecutiveCorrect + 1 : 0,
								//     nextReviewAt: calculateNextReview(response.feedback, existing),
								//     easeFactor: adjustEaseFactor(response.feedback, existing.easeFactor)
								//   });
								// }

								// TODO: ADAPTIVE LEARNING - Detect learning gaps in learningGaps table
								// const incorrectResponses = state.responses.filter(r => r.feedback === 'incorrect');
								// for (const incorrect of incorrectResponses) {
								//   await createOrUpdateLearningGap({
								//     userId: user.id,
								//     contentType: 'cuecard',
								//     contentId: incorrect.cardId,
								//     severity: calculateGapSeverity(incorrect, userHistory),
								//     lastFailureAt: incorrect.attemptedAt
								//   });
								// }

								// TODO: ADAPTIVE LEARNING - Generate AI recommendations (only after minimum sessions threshold)
								// const userSessionCount = await getUserSessionCount(user.id);
								// const MIN_SESSIONS_FOR_RECOMMENDATIONS = 5;
								// if (userSessionCount >= MIN_SESSIONS_FOR_RECOMMENDATIONS) {
								//   const recommendations = await generateSessionRecommendations({
								//     sessionData: sessionRecord,
								//     responses: state.responses,
								//     learningGaps: detectedGaps,
								//     performanceHistory: userHistory
								//   });
								//   await createAIRecommendations(recommendations);
								// }

								// REMOVED: Batch progress update - now handled in real-time via submitFeedback
								// Individual progress updates are handled immediately in submitFeedback for better UX

								// Session manager integration - now uses callback pattern
								try {
									const sessionManager = useSessionManager.getState();
									if (state.id) {
										await sessionManager.actions.endSession(state.id, {
											totalTime: state.startTime
												? Date.now() - state.startTime.getTime()
												: 0,
											itemsCompleted: state.responses.length,
											accuracy: stats.accuracy,
										});
									}
								} catch (e) {
									console.warn(
										"Session manager failed to end, continuing...",
										e
									);
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

							// ✨ REAL-TIME: Immediate progress update (better UX than batch at session end)
							const progressData = {
								status: "completed" as const,
								score: feedback === "correct" ? 100 : 0,
								lastAttemptAt: new Date(),
							};

							try {
								await updateCuecardProgress(currentCard.id, progressData);
								
								// TODO: ADAPTIVE LEARNING - Real-time adaptive updates
								// - Update cuecardScheduling immediately for next review calculation
								// - Detect learning gaps in real-time for immediate feedback
								// - Trigger concept mapping updates for cross-content intelligence
								
							} catch (error) {
								console.warn(
									`Failed to update progress immediately for card ${currentCard.id}:`,
									error
								);
								// Continue with session - adaptive learning will be handled at session end
							}

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

						triggerGeneration: async (
							courseId: string,
							weekIds: string[],
							generationConfig: SelectiveGenerationConfig
						) => {
							try {
								set({ isLoading: true, error: null, status: "generating" });

								const result = await triggerOnDemandGeneration({
									courseId,
									weekId: weekIds[0],
									featureTypes: ["cuecards"],
									config: generationConfig,
									configSource: "course_week_override",
								});

								set({
									isLoading: false,
									status: "generating",
									error: null,
									generationRunId: result.runId,
									generationToken: result.publicAccessToken,
								});
								return {
									success: true,
									runId: result.runId,
									publicAccessToken: result.publicAccessToken,
								};
							} catch (error) {
								console.error("Failed to trigger cuecard generation:", error);

								set({
									isLoading: false,
									error: "Failed to trigger generation",
									status: "failed",
								});
								return {
									success: false,
									error:
										error instanceof Error ? error.message : "Unknown error",
								};
							}
						},

						// Error handling
						setError: (error: string | null) => {
							set({ error });
						},

						// Generation state management
						resetGenerationState: () => {
							set({
								generationRunId: undefined,
								generationToken: undefined,
								status: "idle",
								error: null,
							});
						},
					},
				};
			},
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
