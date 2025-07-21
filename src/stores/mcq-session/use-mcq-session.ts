// MCQ Session Store Implementation
// Dedicated store for multiple choice question learning sessions

import { SAMPLE_MCQ_QUESTIONS } from "@/lib/data/sample-mcq-questions";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type {
	McqAnswer,
	McqConfig,
	McqPerformance,
	McqProgress,
	McqQuestion,
	McqSessionStore,
} from "./types";
import { initialMcqState } from "./types";

// Convert sample data to enhanced McqQuestion format
function convertToEnhancedMcqQuestions(
	sampleQuestions: typeof SAMPLE_MCQ_QUESTIONS
): McqQuestion[] {
	return sampleQuestions.map((question) => ({
		...question,
		topic: extractTopicFromSource(question.source),
		timesSeen: 0,
		timesCorrect: 0,
		timesIncorrect: 0,
		averageResponseTime: 0,
	}));
}

function extractTopicFromSource(source: string): string {
	// Extract topic from filename, removing extension and cleaning up
	const fileName = source.split("/").pop() || source;
	return fileName.replace(".pdf", "").replace(/[-_]/g, " ");
}

function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

function filterQuestionsByConfig(
	questions: McqQuestion[],
	config: McqConfig
): McqQuestion[] {
	let filtered = [...questions];

	// Filter by weeks
	if (config.weeks.length > 0 && !config.weeks.includes("all-weeks")) {
		filtered = filtered.filter((q) =>
			config.weeks.some((week) =>
				q.week.toLowerCase().includes(week.toLowerCase())
			)
		);
	}

	// Filter by difficulty
	if (config.difficulty !== "mixed") {
		filtered = filtered.filter((q) => q.difficulty === config.difficulty);
	}

	// Apply focus strategy
	switch (config.focus) {
		case "weak-areas":
			// Prioritize questions user struggles with or hasn't seen
			filtered.sort((a, b) => {
				const aSuccessRate = a.timesSeen > 0 ? a.timesCorrect / a.timesSeen : 0;
				const bSuccessRate = b.timesSeen > 0 ? b.timesCorrect / b.timesSeen : 0;

				// Lower success rate = higher priority
				return aSuccessRate - bSuccessRate;
			});
			break;

		case "recent-content":
			// Prioritize later weeks
			filtered.sort((a, b) => b.week.localeCompare(a.week));
			break;

		case "tailored-for-me":
			// Mix of difficult questions and review of previous mistakes
			filtered.sort((a, b) => {
				const aDifficultyScore =
					a.difficulty === "hard" ? 3 : a.difficulty === "medium" ? 2 : 1;
				const bDifficultyScore =
					b.difficulty === "hard" ? 3 : b.difficulty === "medium" ? 2 : 1;

				// Prioritize difficult questions and those with mistakes
				return (
					bDifficultyScore +
					b.timesIncorrect -
					(aDifficultyScore + a.timesIncorrect)
				);
			});
			break;

		default:
			// Shuffle for variety
			filtered = shuffleArray(filtered);
			break;
	}

	// Limit to requested number of questions
	return filtered.slice(0, config.numQuestions);
}

const useMcqSession = create<McqSessionStore>()(
	subscribeWithSelector(
		persist(
			(set, get) => ({
				...initialMcqState,

				actions: {
					// Session lifecycle
					startSession: async (config: McqConfig) => {
						try {
							set({ isLoading: true, error: null });

							const sessionId = `mcq_${Date.now()}`;
							const allQuestions =
								convertToEnhancedMcqQuestions(SAMPLE_MCQ_QUESTIONS);

							// Filter questions based on config
							const sessionQuestions = filterQuestionsByConfig(
								allQuestions,
								config
							);

							if (sessionQuestions.length === 0) {
								throw new Error(
									"No questions found matching the specified criteria"
								);
							}

							// Initialize progress
							const progress: McqProgress = {
								currentIndex: 0,
								totalQuestions: sessionQuestions.length,
								correctAnswers: 0,
								incorrectAnswers: 0,
								skippedQuestions: 0,
								timeSpent: 0,
								startedAt: new Date(),
								lastUpdated: new Date(),
								averageTimePerQuestion: 0,
								answers: [],
								flaggedQuestions: [],
								remainingTime: config.timeLimit
									? config.timeLimit * 60 * 1000
									: undefined,
							};

							// Initialize performance
							const performance: McqPerformance = {
								accuracy: 0,
								averageResponseTime: 0,
								difficultyBreakdown: {
									easy: { attempted: 0, correct: 0, accuracy: 0 },
									medium: { attempted: 0, correct: 0, accuracy: 0 },
									hard: { attempted: 0, correct: 0, accuracy: 0 },
								},
								topicBreakdown: {},
								timeEfficiency: 0,
								confidenceAccuracy: 0,
								improvementTrend: 0,
							};

							const currentQuestion = sessionQuestions[0] || null;
							const shuffledOptions =
								config.randomizeOptions && currentQuestion
									? shuffleArray(currentQuestion.options)
									: undefined;

							set({
								id: sessionId,
								status: "active",
								config,
								questions: sessionQuestions,
								progress,
								performance,
								currentQuestion,
								shuffledOptions,
								isLoading: false,
							});

							// Timer functionality would be implemented later for exam mode
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
							// Timer pause functionality would be implemented later for exam mode
						}
					},

					resumeSession: () => {
						const state = get();
						if (state.status === "paused") {
							set({ status: "active" });
							// Timer resume functionality would be implemented later for exam mode
						}
					},

					endSession: async () => {
						const state = get();
						try {
							// Calculate final performance metrics
							const finalPerformance = get().actions.calculatePerformance();

							set({
								status: "completed",
								performance: finalPerformance,
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
						set(initialMcqState);
					},

					// Question management
					getCurrentQuestion: () => {
						const state = get();
						return state.currentQuestion;
					},

					moveToNextQuestion: () => {
						const state = get();
						const nextIndex = state.progress.currentIndex + 1;

						if (nextIndex < state.questions.length) {
							const nextQuestion = state.questions[nextIndex];
							const shuffledOptions = state.config.randomizeOptions
								? shuffleArray(nextQuestion.options)
								: undefined;

							set({
								progress: {
									...state.progress,
									currentIndex: nextIndex,
									lastUpdated: new Date(),
								},
								currentQuestion: nextQuestion,
								shuffledOptions,
							});
						} else {
							// Session completed
							get().actions.endSession();
						}
					},

					moveToPreviousQuestion: () => {
						const state = get();
						const prevIndex = Math.max(0, state.progress.currentIndex - 1);
						const prevQuestion = state.questions[prevIndex];

						// Don't shuffle options when going back - user might be confused
						set({
							progress: {
								...state.progress,
								currentIndex: prevIndex,
								lastUpdated: new Date(),
							},
							currentQuestion: prevQuestion,
							shuffledOptions: undefined,
						});
					},

					jumpToQuestion: (index: number) => {
						const state = get();
						const clampedIndex = Math.max(
							0,
							Math.min(index, state.questions.length - 1)
						);
						const question = state.questions[clampedIndex];

						if (question) {
							const shuffledOptions = state.config.randomizeOptions
								? shuffleArray(question.options)
								: undefined;

							set({
								progress: {
									...state.progress,
									currentIndex: clampedIndex,
									lastUpdated: new Date(),
								},
								currentQuestion: question,
								shuffledOptions,
							});
						}
					},

					flagQuestion: (questionId: string) => {
						const state = get();
						const flaggedQuestions = [
							...new Set([...state.progress.flaggedQuestions, questionId]),
						];

						set({
							progress: {
								...state.progress,
								flaggedQuestions,
								lastUpdated: new Date(),
							},
						});
					},

					unflagQuestion: (questionId: string) => {
						const state = get();
						const flaggedQuestions = state.progress.flaggedQuestions.filter(
							(id) => id !== questionId
						);

						set({
							progress: {
								...state.progress,
								flaggedQuestions,
								lastUpdated: new Date(),
							},
						});
					},

					// Answer submission
					submitAnswer: (
						questionId: string,
						selectedAnswer: string | null,
						timeSpent: number,
						confidenceLevel = 3
					) => {
						const state = get();
						const question = state.questions.find((q) => q.id === questionId);

						if (!question) return;

						const isCorrect = selectedAnswer === question.correctAnswer;
						const isSkipped = selectedAnswer === null;

						// Create answer record
						const answer: McqAnswer = {
							questionId,
							selectedAnswer,
							isCorrect,
							timeSpent,
							confidenceLevel,
							timestamp: new Date(),
						};

						// Update question statistics
						const updatedQuestions = state.questions.map((q) =>
							q.id === questionId
								? {
										...q,
										timesSeen: q.timesSeen + 1,
										timesCorrect: q.timesCorrect + (isCorrect ? 1 : 0),
										timesIncorrect:
											q.timesIncorrect + (!isCorrect && !isSkipped ? 1 : 0),
										averageResponseTime:
											(q.averageResponseTime * q.timesSeen + timeSpent) /
											(q.timesSeen + 1),
									}
								: q
						);

						// Update or add answer to the list
						const existingAnswerIndex = state.progress.answers.findIndex(
							(a) => a.questionId === questionId
						);
						const updatedAnswers = [...state.progress.answers];

						if (existingAnswerIndex >= 0) {
							updatedAnswers[existingAnswerIndex] = answer;
						} else {
							updatedAnswers.push(answer);
						}

						// Update progress
						const totalAttempts = updatedAnswers.filter(
							(a) => a.selectedAnswer !== null
						).length;
						const correctCount = updatedAnswers.filter(
							(a) => a.isCorrect
						).length;
						const incorrectCount = updatedAnswers.filter(
							(a) => !a.isCorrect && a.selectedAnswer !== null
						).length;
						const skippedCount = updatedAnswers.filter(
							(a) => a.selectedAnswer === null
						).length;

						const updatedProgress: McqProgress = {
							...state.progress,
							correctAnswers: correctCount,
							incorrectAnswers: incorrectCount,
							skippedQuestions: skippedCount,
							timeSpent: state.progress.timeSpent + timeSpent,
							lastUpdated: new Date(),
							averageTimePerQuestion:
								totalAttempts > 0
									? (state.progress.timeSpent + timeSpent) / totalAttempts
									: 0,
							answers: updatedAnswers,
						};

						set({
							questions: updatedQuestions,
							progress: updatedProgress,
						});
					},

					changeAnswer: (questionId: string, newAnswer: string | null) => {
						const state = get();
						const answerIndex = state.progress.answers.findIndex(
							(a) => a.questionId === questionId
						);

						if (answerIndex >= 0) {
							const question = state.questions.find((q) => q.id === questionId);
							if (!question) return;

							const isCorrect = newAnswer === question.correctAnswer;
							const updatedAnswers = [...state.progress.answers];

							updatedAnswers[answerIndex] = {
								...updatedAnswers[answerIndex],
								selectedAnswer: newAnswer,
								isCorrect,
								timestamp: new Date(),
							};

							// Recalculate progress
							const correctCount = updatedAnswers.filter(
								(a) => a.isCorrect
							).length;
							const incorrectCount = updatedAnswers.filter(
								(a) => !a.isCorrect && a.selectedAnswer !== null
							).length;
							const skippedCount = updatedAnswers.filter(
								(a) => a.selectedAnswer === null
							).length;

							set({
								progress: {
									...state.progress,
									correctAnswers: correctCount,
									incorrectAnswers: incorrectCount,
									skippedQuestions: skippedCount,
									answers: updatedAnswers,
									lastUpdated: new Date(),
								},
							});
						}
					},

					skipQuestion: () => {
						const state = get();
						if (state.currentQuestion) {
							get().actions.submitAnswer(state.currentQuestion.id, null, 0);
							get().actions.moveToNextQuestion();
						}
					},

					// Progress tracking
					calculateProgress: () => {
						const state = get();
						return state.progress;
					},

					calculatePerformance: () => {
						const state = get();
						const { progress, questions } = state;
						const answers = progress.answers.filter(
							(a) => a.selectedAnswer !== null
						);

						// Basic metrics
						const accuracy =
							answers.length > 0
								? (progress.correctAnswers / answers.length) * 100
								: 0;
						const averageResponseTime =
							answers.length > 0
								? answers.reduce((sum, a) => sum + a.timeSpent, 0) /
									answers.length
								: 0;

						// Difficulty breakdown
						const difficultyBreakdown = {
							easy: { attempted: 0, correct: 0, accuracy: 0 },
							medium: { attempted: 0, correct: 0, accuracy: 0 },
							hard: { attempted: 0, correct: 0, accuracy: 0 },
						};

						for (const answer of answers) {
							const question = questions.find(
								(q) => q.id === answer.questionId
							);
							if (question) {
								const difficulty = question.difficulty;
								difficultyBreakdown[difficulty].attempted++;
								if (answer.isCorrect) {
									difficultyBreakdown[difficulty].correct++;
								}
							}
						}

						// Calculate accuracy for each difficulty
						for (const key of Object.keys(difficultyBreakdown)) {
							const difficulty = key as keyof typeof difficultyBreakdown;
							const data = difficultyBreakdown[difficulty];
							data.accuracy =
								data.attempted > 0 ? (data.correct / data.attempted) * 100 : 0;
						}

						// Topic breakdown
						const topicBreakdown: Record<
							string,
							{ attempted: number; correct: number; accuracy: number }
						> = {};

						for (const answer of answers) {
							const question = questions.find(
								(q) => q.id === answer.questionId
							);
							if (question?.topic) {
								if (!topicBreakdown[question.topic]) {
									topicBreakdown[question.topic] = {
										attempted: 0,
										correct: 0,
										accuracy: 0,
									};
								}
								topicBreakdown[question.topic].attempted++;
								if (answer.isCorrect) {
									topicBreakdown[question.topic].correct++;
								}
							}
						}

						for (const topic of Object.keys(topicBreakdown)) {
							const data = topicBreakdown[topic];
							data.accuracy =
								data.attempted > 0 ? (data.correct / data.attempted) * 100 : 0;
						}

						// Time efficiency (questions per minute)
						const totalTimeMinutes = progress.timeSpent / (1000 * 60);
						const timeEfficiency =
							totalTimeMinutes > 0 ? answers.length / totalTimeMinutes : 0;

						// Confidence accuracy correlation
						const confidenceAnswers = answers.filter(
							(a) => a.confidenceLevel > 0
						);
						let confidenceAccuracy = 0;

						if (confidenceAnswers.length > 0) {
							const confidenceSum = confidenceAnswers.reduce(
								(sum, a) => sum + a.confidenceLevel,
								0
							);
							const correctConfidenceSum = confidenceAnswers
								.filter((a) => a.isCorrect)
								.reduce((sum, a) => sum + a.confidenceLevel, 0);

							confidenceAccuracy =
								confidenceSum > 0
									? (correctConfidenceSum / confidenceSum) * 100
									: 0;
						}

						// Improvement trend (placeholder - would need historical data)
						const improvementTrend = 0;

						const performance: McqPerformance = {
							accuracy,
							averageResponseTime,
							difficultyBreakdown,
							topicBreakdown,
							timeEfficiency,
							confidenceAccuracy,
							improvementTrend,
						};

						set({ performance });
						return performance;
					},

					getSessionStats: () => {
						const state = get();
						const questionsAnswered = state.progress.answers.filter(
							(a) => a.selectedAnswer !== null
						).length;
						const questionsRemaining =
							state.progress.totalQuestions - questionsAnswered;
						const totalAttempts =
							state.progress.correctAnswers + state.progress.incorrectAnswers;
						const accuracy =
							totalAttempts > 0
								? (state.progress.correctAnswers / totalAttempts) * 100
								: 0;

						return {
							totalTime: state.progress.timeSpent,
							questionsAnswered,
							accuracy,
							questionsRemaining,
							averageTimePerQuestion: state.progress.averageTimePerQuestion,
						};
					},

					// Review and navigation
					getAnsweredQuestions: () => {
						const state = get();
						return state.progress.answers.filter(
							(a) => a.selectedAnswer !== null
						);
					},

					getUnansweredQuestions: () => {
						const state = get();
						const answeredIds = new Set(
							state.progress.answers.map((a) => a.questionId)
						);
						return state.questions.filter((q) => !answeredIds.has(q.id));
					},

					getFlaggedQuestions: () => {
						const state = get();
						const flaggedIds = new Set(state.progress.flaggedQuestions);
						return state.questions.filter((q) => flaggedIds.has(q.id));
					},

					getIncorrectAnswers: () => {
						const state = get();
						return state.progress.answers.filter(
							(a) => !a.isCorrect && a.selectedAnswer !== null
						);
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
				name: "mcq-session-store",
				version: 1,
				partialize: (state) => ({
					id: state.id,
					status: state.status,
					config: state.config,
					questions: state.questions,
					progress: state.progress,
					performance: state.performance,
					currentQuestion: state.currentQuestion,
					shuffledOptions: state.shuffledOptions,
					lastSyncedAt: state.lastSyncedAt,
				}),
			}
		)
	)
);

export { useMcqSession };
export type { McqSessionStore };
