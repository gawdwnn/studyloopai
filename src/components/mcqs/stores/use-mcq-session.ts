"use client";

import {
	calculateProgress,
	calculateSessionPerformance,
} from "@/components/mcqs/utils/mcq-scoring";
import { createGenerationHandlers } from "@/hooks/use-on-demand-generation";
import {
	addSessionResponse,
	completeSession,
	createOrUpdateLearningGap,
	createSessionOnly,
} from "@/lib/actions/adaptive-learning";
import type { UserMCQ } from "@/lib/actions/mcq";
import { createLogger } from "@/lib/utils/logger";
import { createTimerActions } from "@/lib/utils/timer-mixin";
import { toast } from "sonner";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
	McqAnswer,
	McqConfig,
	McqQuestion,
	McqSessionStore,
} from "./types";
import {
	initialMcqPerformance,
	initialMcqProgress,
	initialMcqState,
} from "./types";

const logger = createLogger("MCQSession");

const useMcqSession = create<McqSessionStore>()(
	subscribeWithSelector((set, get): McqSessionStore => {
		return {
			...initialMcqState,

			actions: {
				// Timer actions from mixin
				...createTimerActions(set, get),
				// On-demand generation
				...createGenerationHandlers("mcqs", set, get),
				// Start session with pre-loaded data (optimized component-driven approach)
				startSession: async (config: McqConfig, preLoadedMCQs: UserMCQ[]) => {
					try {
						set({ isLoading: true, status: "loading" });

						const sessionId = `mcq_${Date.now()}`;

						// Use pre-loaded data - no database fetch needed
						if (preLoadedMCQs.length === 0) {
							set({
								isLoading: false,
								status: "needs_generation",
							});
							return;
						}

						// Transform UserMCQ to McqQuestion format
						const questions: McqQuestion[] = preLoadedMCQs.map((mcq) => ({
							id: mcq.id,
							question: mcq.question,
							options: mcq.options,
							correctAnswer: mcq.correctAnswer,
							explanation: mcq.explanation || undefined,
							difficulty: (["easy", "medium", "hard"].includes(
								mcq.difficulty || ""
							)
								? mcq.difficulty
								: "medium") as "easy" | "medium" | "hard",
							source: `Week ${mcq.weekNumber}`,
							week: mcq.weekId,
							topic: undefined, // Could be extracted from metadata if available
							timesSeen: 0,
							timesCorrect: 0,
							timesIncorrect: 0,
							averageResponseTime: 0,
						}));

						// Use all questions directly like cuecards
						const filteredQuestions = questions;

						// Create session in database immediately for real-time persistence
						let realTimeSessionId: string | null = null;
						try {
							const dbSession = await createSessionOnly({
								contentType: "mcq",
								sessionConfig: {
									courseId: config.courseId || "",
									weeks: config.weeks,
								},
								startedAt: new Date(),
							});
							realTimeSessionId = dbSession?.id || null;
							logger.info("Created real-time session", {
								sessionId: realTimeSessionId,
								dbSessionObject: dbSession,
							});
						} catch (dbError) {
							logger.warn(
								{ error: dbError },
								"Failed to create real-time session, continuing without persistence"
							);
						}

						// Initialize session state
						const startTime = new Date();
						const initialProgress = {
							...initialMcqProgress,
							totalQuestions: filteredQuestions.length,
							startedAt: startTime,
							lastUpdated: startTime,
						};

						set({
							id: sessionId,
							status: "active",
							config,
							questions: filteredQuestions,
							progress: initialProgress,
							performance: initialMcqPerformance,
							currentQuestion: filteredQuestions[0] || null,
							isLoading: false,
							lastSyncedAt: startTime,
							realTimeSessionId,
						});

						// Initialize and start session timer
						get().actions.resetTimer();
						get().actions.startTimer();
						get().actions.startItem();

						logger.info(
							{
								sessionId,
								questionCount: filteredQuestions.length,
								config,
							},
							"MCQ session started successfully with pre-loaded data"
						);
					} catch (error) {
						logger.error({ error }, "Failed to start MCQ session");
						set({
							isLoading: false,
							status: "failed",
						});
						throw error;
					}
				},

				endSession: async () => {
					const state = get();

					// Stop and capture final timer state
					get().actions.pauseTimer();
					const totalSessionTime = state.sessionElapsedTime;

					const finalPerformance = calculateSessionPerformance(
						state.progress.answers,
						state.questions
					);
					const sessionId: string | null = state.realTimeSessionId;

					// Try to save to database if session exists
					if (sessionId) {
						try {
							await completeSession({
								sessionId,
								totalTime: totalSessionTime,
								accuracy: finalPerformance.accuracy,
								completedAt: new Date(),
							});
						} catch (error) {
							// Log error but don't block session completion
							logger.error("Failed to save session to database", { error });
						}
					}

					// Always complete the session
					set({
						status: "completed",
						performance: finalPerformance,
						progress: {
							...state.progress,
							timeSpent: totalSessionTime, // Sync progress time with session time
						},
						lastSyncedAt: new Date(),
						learningSessionId: sessionId,
					});

					return sessionId;
				},

				resetSession: () => {
					set({
						...initialMcqState,
						// Reset all state including generation tokens
						generationRunId: undefined,
						generationToken: undefined,
						learningSessionId: undefined,
						realTimeSessionId: null,
					});

					// Reset timer state
					get().actions.resetTimer();

					logger.info("MCQ session reset and storage cleared");
				},

				// Answer submission
				submitAnswer: async (
					questionId: string,
					selectedAnswer: string | null,
					timeSpent?: number, // Made optional since timer will provide it
					confidenceLevel?: number
				) => {
					const state = get();
					const question = state.questions.find((q) => q.id === questionId);

					if (!question) {
						logger.warn(
							{ questionId },
							"Question not found for answer submission"
						);
						return;
					}

					// Use timer action to get accurate time spent on this question
					const actualTimeSpent = timeSpent ?? get().actions.finishItem();

					// Convert correctAnswer index to actual option text for comparison
					const correctOptionText =
						question.options[Number.parseInt(question.correctAnswer)];
					const isCorrect = selectedAnswer === correctOptionText;

					// Create answer record
					const answer: McqAnswer = {
						questionId,
						selectedAnswer,
						isCorrect,
						timeSpent: actualTimeSpent,
						confidenceLevel: confidenceLevel || 3,
						timestamp: new Date(),
					};

					// Track learning gaps for incorrect answers
					if (!isCorrect) {
						// Calculate severity based on confidence and response time
						const avgResponseTime = 30000; // 30 seconds baseline
						const timeFactor = actualTimeSpent > avgResponseTime ? 1 : 2; // Struggled if took long time
						const confidenceFactor = (confidenceLevel || 3) > 3 ? 2 : 1; // Higher penalty for overconfidence
						const severity = Math.min(10, 3 * timeFactor * confidenceFactor);

						// Async learning gap tracking - don't block the UI
						createOrUpdateLearningGap({
							contentType: "mcq",
							contentId: questionId,
							conceptId: question.topic,
							severity,
						}).catch((error) => {
							logger.warn(
								{ error, questionId },
								"Failed to track learning gap"
							);
						});
					}

					// OPTIMISTIC UPDATE: Update local state immediately for responsive UX
					const answers = [...state.progress.answers];
					const existingIndex = answers.findIndex(
						(a) => a.questionId === questionId
					);

					if (existingIndex >= 0) {
						// Update existing answer
						answers[existingIndex] = answer;
					} else {
						// Add new answer
						answers.push(answer);
					}

					// Calculate updated progress and performance using session timer
					const updatedProgress = calculateProgress(
						answers,
						state.questions.length,
						state.progress.startedAt,
						state.sessionElapsedTime // Use store timer instead of manual calculation
					);

					const updatedPerformance = calculateSessionPerformance(
						answers,
						state.questions
					);

					// Update UI immediately - optimistic update
					set({
						progress: {
							...updatedProgress,
							flaggedQuestions: state.progress.flaggedQuestions, // Preserve flags
						},
						performance: updatedPerformance,
						lastSyncedAt: new Date(),
					});

					// Check if all questions have been answered (auto-end like cuecards)
					if (answers.length >= state.questions.length) {
						// All questions answered, automatically end the session
						await get().actions.endSession();
					}

					// Save response to database in background - non-blocking
					if (state.realTimeSessionId) {
						const sessionId = state.realTimeSessionId;
						logger.info("Saving response to real-time session", {
							sessionId,
							questionId,
							isCorrect,
							timeSpent: actualTimeSpent,
						});

						// Background database operation
						(async () => {
							try {
								logger.info("Attempting to save MCQ response", {
									sessionId,
									questionId,
									isCorrect,
									timeSpent: actualTimeSpent,
									timestamp: answer.timestamp,
								});

								const result = await addSessionResponse(sessionId, {
									contentId: questionId,
									responseData: {
										isCorrect,
										timeSpent: actualTimeSpent,
									},
									responseTime: actualTimeSpent,
									isCorrect,
									attemptedAt: answer.timestamp,
								});

								if (!result) {
									throw new Error("Response not saved - null result");
								}

								logger.info("Response saved successfully", {
									responseId: result.id,
									questionId,
								});
							} catch (error) {
								logger.error(
									"Failed to save response to real-time session - DETAILED ERROR",
									{
										error:
											error instanceof Error ? error.message : String(error),
										errorStack:
											error instanceof Error ? error.stack : undefined,
										questionId,
										sessionId,
										responseData: {
											isCorrect,
											timeSpent: actualTimeSpent,
											timestamp: answer.timestamp,
										},
									}
								);

								// Only show error without blocking UI
								toast.error(
									"Failed to save your response. Your progress is stored locally."
								);
							}
						})(); // Immediately invoked async function
					}

					// Note: Timer for next question will be started when user manually progresses via handleNextQuestion

					logger.debug(
						{
							questionId,
							selectedAnswer,
							isCorrect,
							timeSpent: actualTimeSpent,
						},
						"Answer submitted and stored"
					);
				},

				// Question skip
				skipQuestion: async (
					questionId: string,
					timeSpent?: number // Optional - timer will provide it
				) => {
					const state = get();
					const question = state.questions.find((q) => q.id === questionId);
					if (!question) {
						logger.warn(
							{ questionId },
							"Question not found for skip submission"
						);
						return;
					}

					// Use timer action to get accurate time spent on this question
					const actualTimeSpent = timeSpent ?? get().actions.finishItem();

					// Create skip answer record
					const answer: McqAnswer = {
						questionId,
						selectedAnswer: null, // No answer selected for skip
						isCorrect: false, // Skipped questions are treated as incorrect
						timeSpent: actualTimeSpent,
						confidenceLevel: 1, // Low confidence for skipped questions
						timestamp: new Date(),
					};

					// OPTIMISTIC UPDATE: Update local state immediately for responsive UX
					const answers = [...state.progress.answers];
					const existingIndex = answers.findIndex(
						(a) => a.questionId === questionId
					);

					if (existingIndex >= 0) {
						// Update existing answer
						answers[existingIndex] = answer;
					} else {
						// Add new answer
						answers.push(answer);
					}

					// Calculate updated progress and performance using session timer
					const updatedProgress = calculateProgress(
						answers,
						state.questions.length,
						state.progress.startedAt,
						state.sessionElapsedTime // Use store timer instead of manual calculation
					);

					const updatedPerformance = calculateSessionPerformance(
						answers,
						state.questions
					);

					// Update UI immediately - optimistic update
					set({
						progress: {
							...updatedProgress,
							flaggedQuestions: state.progress.flaggedQuestions, // Preserve flags
						},
						performance: updatedPerformance,
						lastSyncedAt: new Date(),
					});

					// Check if all questions have been answered (auto-end like cuecards)
					if (answers.length >= state.questions.length) {
						// All questions answered, automatically end the session
						await get().actions.endSession();
					}

					// Save skip response to database in background - non-blocking
					if (state.realTimeSessionId) {
						const sessionId = state.realTimeSessionId;
						logger.info("Saving skip response to real-time session", {
							sessionId,
							questionId,
							timeSpent: actualTimeSpent,
						});

						// Background database operation
						(async () => {
							try {
								const result = await addSessionResponse(sessionId, {
									contentId: questionId,
									responseData: {
										isCorrect: false,
										timeSpent: actualTimeSpent,
									},
									responseTime: actualTimeSpent,
									isCorrect: false,
									attemptedAt: answer.timestamp,
								});

								if (!result) {
									throw new Error("Skip response not saved - null result");
								}

								logger.info("Skip response saved successfully", {
									responseId: result.id,
									questionId,
								});
							} catch (error) {
								logger.error(
									"Failed to save skip response to real-time session",
									{
										error,
										questionId,
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

					logger.debug(
						{
							questionId,
							timeSpent: actualTimeSpent,
						},
						"Question skipped and stored"
					);
				},
			},
		};
	})
);

// No session recovery - all data is ephemeral

export { useMcqSession };
export type { McqSessionStore };
