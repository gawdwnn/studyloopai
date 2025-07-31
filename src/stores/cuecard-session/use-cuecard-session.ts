"use client";

import type { UserCuecard } from "@/lib/actions/cuecard";
import { triggerOnDemandGeneration } from "@/lib/services/on-demand-generation-service";
import { createLogger } from "@/lib/utils/logger";
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
} from "./types";
import { initialCuecardState } from "./types";

const logger = createLogger("CuecardSession");

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
					logger.warn(
						{ error },
						"Failed to register callbacks with Session Manager"
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
							preLoadedCards: UserCuecard[],
							useAdaptiveSelection = true
						) => {
							try {
								set({ isLoading: true, error: null, status: "loading" });

								const sessionId = `cuecard_${Date.now()}`;

								// Session manager integration
								try {
									const sessionManager = useSessionManager.getState();
									await sessionManager.actions.startSession("cuecards", config);
								} catch (e) {
									logger.warn(
										{ error: e },
										"Session manager failed to start, continuing..."
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
												"🎯 Smart selection completed"
											);
										} else {
											// Fallback to original cards if smart selection returns empty
											orderedCards = preLoadedCards;
											logger.warn(
												{
													availableCards: preLoadedCards.length,
												},
												"⚠️ Smart selection returned empty, using all cards"
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
									error: null,
									cardStartTime: new Date(),
								});
							} catch (error) {
								logger.error(
									{ error },
									"Failed to start cuecard session with data"
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

						// session end with adaptive learning integration
						endSession: async () => {
							const state = get();

							if (state.status !== "active") {
								logger.warn({ status: state.status }, "❌ Session not active");
								return;
							}

							try {
								const {
									createLearningSession,
									createSessionResponses,
									createOrUpdateLearningGap,
								} = await import("@/lib/actions/adaptive-learning");
								const { updateCuecardScheduling } = await import(
									"@/lib/actions/spaced-repetition"
								);

								// Calculate session stats
								const correct = state.responses.filter(
									(r) => r.feedback === "correct"
								).length;
								const totalResponses = state.responses.length;
								const accuracy = Math.round(
									totalResponses > 0 ? (correct / totalResponses) * 100 : 0
								);
								const totalTime = state.startTime
									? Date.now() - state.startTime.getTime()
									: 0;
								const sessionRecord = await createLearningSession({
									contentType: "cuecard",
									sessionConfig: {
										courseId:
											state.config.courseId || state.setupConfig.courseId,
										weeks: state.config.weeks || [state.setupConfig.week],
										sessionMode: "practice",
									},
									totalTime,
									itemsCompleted: state.responses.length,
									accuracy,
									startedAt: state.startTime || new Date(),
									completedAt: new Date(),
								});

								if (sessionRecord) {
									// Record detailed responses
									const responseData = state.responses.map((response) => ({
										contentId: response.cardId,
										responseData: {
											feedback: response.feedback,
											timeSpent: response.timeSpent,
										},
										responseTime: response.timeSpent,
										isCorrect: response.feedback === "correct",
										attemptedAt: response.attemptedAt,
									}));
									await createSessionResponses(sessionRecord.id, responseData);

									// Update spaced repetition scheduling for each card
									for (const response of state.responses) {
										try {
											await updateCuecardScheduling({
												cardId: response.cardId,
												userId: sessionRecord.userId,
												isCorrect: response.feedback === "correct",
												responseTime: response.timeSpent,
											});
										} catch (error) {
											logger.warn(
												{
													error,
													cardId: response.cardId,
												},
												"Failed to update scheduling for card"
											);
										}
									}

									// Create learning gaps for incorrect responses
									const incorrectResponses = state.responses.filter(
										(r) => r.feedback === "incorrect"
									);
									for (const incorrect of incorrectResponses) {
										try {
											await createOrUpdateLearningGap({
												contentType: "cuecard",
												contentId: incorrect.cardId,
												severity: 5, // Default medium severity
											});
										} catch (error) {
											logger.warn(
												{
													error,
													cardId: incorrect.cardId,
												},
												"Failed to create learning gap for card"
											);
										}
									}

									// Session manager integration
									try {
										const sessionManager = useSessionManager.getState();
										if (state.id) {
											await sessionManager.actions.endSession(state.id, {
												totalTime,
												itemsCompleted: state.responses.length,
												accuracy,
											});
										}
									} catch (e) {
										logger.warn(
											{ error: e },
											"Session manager failed to end, continuing"
										);
									}

									set({ status: "completed", cardStartTime: null });
									return sessionRecord.id;
								}

								// Fallback if session creation failed
								logger.error(
									"❌ Session record creation failed, sessionRecord is null"
								);
								set({ status: "completed", cardStartTime: null });
								return undefined;
							} catch (error) {
								logger.error({ error }, "💥 Failed to end cuecard session");
								const errorMessage =
									error instanceof Error
										? error.message
										: "An unknown error occurred";
								set({
									error: `Failed to save session progress: ${errorMessage}`,
									status: "failed",
								});
								return undefined;
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
								// Update state first
								set({
									responses: newResponses,
									currentIndex: nextIndex, // Update index to prevent loop
								});
								// End session and get session ID
								const sessionId = await get().actions.endSession();

								// Navigate to feedback page with session ID
								if (sessionId) {
									window.location.href = `/dashboard/feedback?sessionId=${sessionId}`;
								} else {
									logger.warn("⚠️ No sessionId received, navigating without it");
									// Fallback navigation without session ID
									window.location.href = "/dashboard/feedback";
								}
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
								logger.error({ error }, "Failed to trigger cuecard generation");

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
