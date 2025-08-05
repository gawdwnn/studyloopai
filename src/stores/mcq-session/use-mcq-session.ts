"use client";

import {
	calculateProgress,
	calculateSessionPerformance,
} from "@/components/mcqs/utils/mcq-scoring";
import {
	createLearningSession,
	createOrUpdateLearningGap,
	createSessionResponses,
} from "@/lib/actions/adaptive-learning";
import type { UserMCQ } from "@/lib/actions/mcq";
import { triggerOnDemandGeneration } from "@/lib/services/on-demand-generation-service";
import { createLogger } from "@/lib/utils/logger";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
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
	subscribeWithSelector(
		persist(
			(set, get): McqSessionStore => {
				return {
					...initialMcqState,

					actions: {
						// Start session with pre-loaded data (optimized component-driven approach)
						startSessionWithData: async (
							config: McqConfig,
							preLoadedMCQs: UserMCQ[]
						) => {
							try {
								set({ isLoading: true, error: null, status: "loading" });

								const sessionId = `mcq_${Date.now()}`;

								// Use pre-loaded data - no database fetch needed
								if (preLoadedMCQs.length === 0) {
									set({
										isLoading: false,
										error: "No MCQs available for session",
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
									difficulty:
										(mcq.difficulty as "easy" | "medium" | "hard") || "medium",
									source: `Week ${mcq.weekNumber}`,
									week: mcq.weekId,
									topic: undefined, // Could be extracted from metadata if available
									timesSeen: 0,
									timesCorrect: 0,
									timesIncorrect: 0,
									averageResponseTime: 0,
								}));

								// Apply configuration filters
								let filteredQuestions = questions;

								// Filter by difficulty if specified
								if (config.difficulty && config.difficulty !== "mixed") {
									filteredQuestions = questions.filter(
										(q) => q.difficulty === config.difficulty
									);
								}

								// Shuffle if randomization enabled
								if (config.randomizeOptions) {
									filteredQuestions = filteredQuestions.map((q) => ({
										...q,
										options: [...q.options].sort(() => Math.random() - 0.5),
									}));
								}

								// Limit number of questions
								if (
									config.numQuestions &&
									filteredQuestions.length > config.numQuestions
								) {
									// Shuffle questions and take the required number
									const shuffled = [...filteredQuestions].sort(
										() => Math.random() - 0.5
									);
									filteredQuestions = shuffled.slice(0, config.numQuestions);
								}

								if (filteredQuestions.length === 0) {
									set({
										isLoading: false,
										error: "No MCQs match the selected configuration",
										status: "failed",
									});
									return;
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
									shuffledOptions: undefined,
									error: null,
									isLoading: false,
									lastSyncedAt: startTime,
								});

								logger.info(
									{
										sessionId,
										questionCount: filteredQuestions.length,
										config,
									},
									"MCQ session started successfully with pre-loaded data"
								);
							} catch (error) {
								const errorMessage =
									error instanceof Error ? error.message : "Unknown error";
								logger.error({ error }, "Failed to start MCQ session");
								set({
									isLoading: false,
									error: errorMessage,
									status: "failed",
								});
								throw error;
							}
						},

						endSession: async () => {
							try {
								const state = get();

								// Calculate final performance
								const finalPerformance = calculateSessionPerformance(
									state.progress.answers,
									state.questions
								);

								// Record session to database
								try {
									const completedAt = new Date();
									const sessionData = await createLearningSession({
										contentType: "mcq",
										sessionConfig: {
											courseId: state.config.courseId,
											weeks: state.config.weeks,
											questionCount: state.questions.length,
											timeLimit: state.config.timeLimit,
										},
										totalTime: state.progress.timeSpent,
										itemsCompleted:
											state.progress.correctAnswers +
											state.progress.incorrectAnswers,
										accuracy: finalPerformance.accuracy,
										startedAt: state.progress.startedAt,
										completedAt,
									});

									// Record individual responses if session was created
									if (sessionData?.id) {
										const responses = state.progress.answers.map((answer) => ({
											contentId: answer.questionId,
											responseData: {
												selectedOption: answer.selectedAnswer || "",
												timeSpent: answer.timeSpent,
												allOptions:
													state.questions.find(
														(q) => q.id === answer.questionId
													)?.options || [],
												correctOption:
													state.questions.find(
														(q) => q.id === answer.questionId
													)?.correctAnswer || "",
											},
											responseTime: answer.timeSpent,
											isCorrect: answer.isCorrect,
											attemptedAt: answer.timestamp,
										}));

										await createSessionResponses(sessionData.id, responses);
									}

									logger.info(
										{
											sessionId: sessionData?.id,
											questionCount: state.questions.length,
										},
										"MCQ session persisted to database"
									);
								} catch (dbError) {
									logger.warn(
										{ error: dbError },
										"Failed to persist session to database"
									);
									// Continue with session completion even if database fails
								}

								set({
									status: "completed",
									performance: finalPerformance,
									lastSyncedAt: new Date(),
								});

								logger.info({ sessionId: state.id }, "MCQ session completed");
							} catch (error) {
								logger.error({ error }, "Failed to end MCQ session");
								set({ error: "Failed to end session properly" });
							}
						},

						resetSession: () => {
							set({
								...initialMcqState,
								// Preserve any persistent settings if needed
							});
							logger.info("MCQ session reset");
						},

						// Answer submission
						submitAnswer: (
							questionId: string,
							selectedAnswer: string | null,
							timeSpent: number,
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

							const isCorrect = selectedAnswer === question.correctAnswer;

							// Create answer record
							const answer: McqAnswer = {
								questionId,
								selectedAnswer,
								isCorrect,
								timeSpent,
								confidenceLevel: confidenceLevel || 3,
								timestamp: new Date(),
							};

							// Track learning gaps for incorrect answers
							if (!isCorrect) {
								// Calculate severity based on confidence and response time
								const avgResponseTime = 30000; // 30 seconds baseline
								const timeFactor = timeSpent > avgResponseTime ? 1 : 2; // Struggled if took long time
								const confidenceFactor = (confidenceLevel || 3) > 3 ? 2 : 1; // Higher penalty for overconfidence
								const severity = Math.min(
									10,
									3 * timeFactor * confidenceFactor
								);

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

							// Update answers array
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

							// Calculate updated progress and performance
							const updatedProgress = calculateProgress(
								answers,
								state.questions.length,
								state.progress.startedAt
							);

							const updatedPerformance = calculateSessionPerformance(
								answers,
								state.questions
							);

							set({
								progress: {
									...updatedProgress,
									flaggedQuestions: state.progress.flaggedQuestions, // Preserve flags
								},
								performance: updatedPerformance,
								lastSyncedAt: new Date(),
							});

							logger.debug(
								{ questionId, selectedAnswer, isCorrect, timeSpent },
								"Answer submitted with learning gap tracking"
							);
						},

						// Error handling
						setError: (error: string | null) => {
							set({ error });
							if (error) {
								logger.error({ error }, "MCQ session error set");
							}
						},

						clearError: () => {
							set({ error: null });
							logger.debug("MCQ session error cleared");
						},

						// On-demand generation
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
									featureTypes: ["mcqs"],
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
								logger.error({ error }, "Failed to trigger MCQ generation");

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
					},
				};
			},
			{
				name: "mcq-session-store",
				version: 1,
				// Only persist essential data for recovery
				partialize: (state) => ({
					id: state.id,
					status: state.status,
					config: state.config,
					progress: {
						currentIndex: state.progress.currentIndex,
						answers: state.progress.answers,
						flaggedQuestions: state.progress.flaggedQuestions,
						startedAt: state.progress.startedAt,
					},
					// Don't persist questions - they should be reloaded
					generationRunId: state.generationRunId,
					generationToken: state.generationToken,
				}),
			}
		)
	)
);

export { useMcqSession };
export type { McqSessionStore };

// Re-export selector functions for convenience
export {
	selectMcqProgress,
	selectCorrectAnswers,
	selectIncorrectAnswers,
	selectSkippedQuestions,
	selectTotalTimeSpent,
	selectAverageTimePerQuestion,
} from "./mcq-selectors";
