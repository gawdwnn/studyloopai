// Open Question Session Store Implementation
// Dedicated store for open-ended question learning sessions

import { SAMPLE_OPEN_QUESTIONS } from "@/lib/data/sample-open-questions";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type {
	EvaluationStatus,
	OpenQuestion,
	OpenQuestionAnswer,
	OpenQuestionConfig,
	OpenQuestionPerformance,
	OpenQuestionProgress,
	OpenQuestionSessionStore,
} from "./types";
import { initialOpenQuestionState } from "./types";

// Convert sample data to enhanced OpenQuestion format
function convertToEnhancedOpenQuestions(
	sampleQuestions: typeof SAMPLE_OPEN_QUESTIONS
): OpenQuestion[] {
	return sampleQuestions.map((question) => ({
		...question,
		topic: extractTopicFromSource(question.source),
		keywords: extractKeywordsFromSample(question.sampleAnswer),
		timesSeen: 0,
		timesAnswered: 0,
		averageScore: 0,
		averageWordCount: 0,
		averageResponseTime: 0,
	}));
}

function extractTopicFromSource(source: string): string {
	const fileName = source.split("/").pop() || source;
	return fileName.replace(".pdf", "").replace(/[-_]/g, " ");
}

function extractKeywordsFromSample(sampleAnswer: string): string[] {
	// Simple keyword extraction - in production, this would use NLP
	const words = sampleAnswer.toLowerCase().split(/\W+/);
	const commonWords = new Set([
		"the",
		"a",
		"an",
		"and",
		"or",
		"but",
		"in",
		"on",
		"at",
		"to",
		"for",
		"of",
		"with",
		"by",
		"is",
		"are",
		"was",
		"were",
		"be",
		"been",
		"have",
		"has",
		"had",
		"do",
		"does",
		"did",
		"will",
		"would",
		"could",
		"should",
		"may",
		"might",
		"can",
		"that",
		"this",
		"these",
		"those",
		"they",
		"them",
		"their",
		"it",
		"its",
	]);

	return words.filter((word) => word.length > 4 && !commonWords.has(word)).slice(0, 10); // Top 10 keywords
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
	questions: OpenQuestion[],
	config: OpenQuestionConfig
): OpenQuestion[] {
	let filtered = [...questions];

	// Filter by weeks
	if (config.weeks.length > 0 && !config.weeks.includes("all-weeks")) {
		filtered = filtered.filter((q) =>
			config.weeks.some((week) => q.week.toLowerCase().includes(week.toLowerCase()))
		);
	}

	// Filter by difficulty
	if (config.difficulty !== "mixed") {
		filtered = filtered.filter((q) => q.difficulty === config.difficulty);
	}

	// Apply focus strategy
	switch (config.focus) {
		case "weak-areas":
			// Prioritize questions with low scores
			filtered.sort((a, b) => a.averageScore - b.averageScore);
			break;

		case "recent-content":
			// Prioritize later weeks
			filtered.sort((a, b) => b.week.localeCompare(a.week));
			break;

		case "tailored-for-me":
			// Mix of challenging questions and those needing review
			filtered.sort((a, b) => {
				const aDifficultyScore = a.difficulty === "hard" ? 3 : a.difficulty === "medium" ? 2 : 1;
				const bDifficultyScore = b.difficulty === "hard" ? 3 : b.difficulty === "medium" ? 2 : 1;

				const aScore = aDifficultyScore + (1 - a.averageScore) * 2;
				const bScore = bDifficultyScore + (1 - b.averageScore) * 2;

				return bScore - aScore;
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

// Simple AI evaluation simulation (in production, this would call actual AI service)
async function simulateAiEvaluation(
	question: OpenQuestion,
	userAnswer: string
): Promise<{
	score: number;
	keywordMatches: string[];
	feedback: string;
	improvementSuggestions: string[];
}> {
	// Simulate API delay
	await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

	const userWords = userAnswer.toLowerCase().split(/\W+/);
	const keywordMatches =
		question.keywords?.filter((keyword) =>
			userWords.some((word) => word.includes(keyword.toLowerCase()))
		) || [];

	// Simple scoring based on keyword matches and length
	const keywordScore = keywordMatches.length / (question.keywords?.length || 1);
	const lengthScore = Math.min(userAnswer.split(/\s+/).length / 50, 1); // Assume 50 words is good length
	const score = Math.min(keywordScore * 0.7 + lengthScore * 0.3, 1);

	const feedback =
		score > 0.8
			? "Excellent answer! You covered the key concepts well."
			: score > 0.6
				? "Good answer, but could be more comprehensive."
				: score > 0.4
					? "Your answer addresses some points but misses key concepts."
					: "This answer needs significant improvement to address the question properly.";

	const improvementSuggestions = [];
	if (keywordScore < 0.5) {
		improvementSuggestions.push(
			`Consider discussing: ${question.keywords?.slice(0, 3).join(", ")}`
		);
	}
	if (lengthScore < 0.5) {
		improvementSuggestions.push("Try to provide a more detailed explanation with examples.");
	}

	return { score, keywordMatches, feedback, improvementSuggestions };
}

const useOpenQuestionSession = create<OpenQuestionSessionStore>()(
	subscribeWithSelector(
		persist(
			(set, get) => ({
				...initialOpenQuestionState,

				actions: {
					// Session lifecycle
					startSession: async (config: OpenQuestionConfig) => {
						try {
							set({ isLoading: true, error: null });

							const sessionId = `openq_${Date.now()}`;
							const allQuestions = convertToEnhancedOpenQuestions(SAMPLE_OPEN_QUESTIONS);

							// Filter questions based on config
							const sessionQuestions = filterQuestionsByConfig(allQuestions, config);

							if (sessionQuestions.length === 0) {
								throw new Error("No questions found matching the specified criteria");
							}

							// Initialize progress
							const progress: OpenQuestionProgress = {
								currentIndex: 0,
								totalQuestions: sessionQuestions.length,
								answeredQuestions: 0,
								skippedQuestions: 0,
								timeSpent: 0,
								startedAt: new Date(),
								lastUpdated: new Date(),
								averageTimePerQuestion: 0,
								averageWordCount: 0,
								averageScore: 0,
								answers: [],
								flaggedQuestions: [],
								remainingTime: config.timeLimit ? config.timeLimit * 60 * 1000 : undefined,
							};

							// Initialize performance
							const performance: OpenQuestionPerformance = {
								overallScore: 0,
								averageResponseTime: 0,
								averageWordCount: 0,
								wordCountTrend: 0,
								scoreTrend: 0,
								difficultyBreakdown: {
									easy: { attempted: 0, averageScore: 0, averageWordCount: 0 },
									medium: {
										attempted: 0,
										averageScore: 0,
										averageWordCount: 0,
									},
									hard: { attempted: 0, averageScore: 0, averageWordCount: 0 },
								},
								topicBreakdown: {},
								writingMetrics: {
									vocabularyDiversity: 0,
									averageSentenceLength: 0,
									keywordUsage: 0,
									clarity: 0,
								},
								timeEfficiency: 0,
								consistencyScore: 0,
							};

							set({
								id: sessionId,
								status: "active",
								config,
								questions: sessionQuestions,
								progress,
								performance,
								currentQuestion: sessionQuestions[0] || null,
								currentAnswer: "",
								isLoading: false,
							});

							// Timer functionality would be implemented later for exam mode
						} catch (error) {
							set({
								error: error instanceof Error ? error.message : "Failed to start session",
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
								error: error instanceof Error ? error.message : "Failed to end session",
								status: "failed",
							});
						}
					},

					resetSession: () => {
						set(initialOpenQuestionState);
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
							set({
								progress: {
									...state.progress,
									currentIndex: nextIndex,
									lastUpdated: new Date(),
								},
								currentQuestion: state.questions[nextIndex],
								currentAnswer: "", // Clear current answer
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

						// Load previous answer if it exists
						const prevAnswer = state.progress.answers.find((a) => a.questionId === prevQuestion.id);

						set({
							progress: {
								...state.progress,
								currentIndex: prevIndex,
								lastUpdated: new Date(),
							},
							currentQuestion: prevQuestion,
							currentAnswer: prevAnswer?.userAnswer || "",
						});
					},

					jumpToQuestion: (index: number) => {
						const state = get();
						const clampedIndex = Math.max(0, Math.min(index, state.questions.length - 1));
						const question = state.questions[clampedIndex];

						if (question) {
							// Load existing answer if available
							const existingAnswer = state.progress.answers.find(
								(a) => a.questionId === question.id
							);

							set({
								progress: {
									...state.progress,
									currentIndex: clampedIndex,
									lastUpdated: new Date(),
								},
								currentQuestion: question,
								currentAnswer: existingAnswer?.userAnswer || "",
							});
						}
					},

					flagQuestion: (questionId: string) => {
						const state = get();
						const flaggedQuestions = [...new Set([...state.progress.flaggedQuestions, questionId])];

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

					// Answer management
					updateCurrentAnswer: (answer: string) => {
						set({ currentAnswer: answer });
					},

					submitAnswer: async (questionId: string, answer: string, timeSpent: number) => {
						const state = get();
						const question = state.questions.find((q) => q.id === questionId);

						if (!question) return;

						try {
							set({ isEvaluating: true });

							// Create answer object
							const answerObj: OpenQuestionAnswer = {
								questionId,
								userAnswer: answer,
								wordCount: answer
									.trim()
									.split(/\s+/)
									.filter((w) => w.length > 0).length,
								timeSpent,
								timestamp: new Date(),
								evaluationStatus: "pending",
							};

							// Evaluate answer if AI evaluation is enabled
							if (state.config.enableAiEvaluation && answer.trim()) {
								answerObj.evaluationStatus = "evaluating";

								try {
									const evaluation = await simulateAiEvaluation(question, answer);
									answerObj.aiScore = evaluation.score;
									answerObj.keywordMatches = evaluation.keywordMatches;
									answerObj.feedback = evaluation.feedback;
									answerObj.improvementSuggestions = evaluation.improvementSuggestions;
									answerObj.evaluationStatus = "completed";
								} catch {
									answerObj.evaluationStatus = "failed";
									answerObj.feedback = "Evaluation failed - please try again";
								}
							} else {
								answerObj.evaluationStatus = "completed";
								answerObj.aiScore = answer.trim() ? 0.5 : 0; // Default score for non-evaluated answers
							}

							// Update question statistics
							const updatedQuestions = state.questions.map((q) =>
								q.id === questionId
									? {
											...q,
											timesSeen: q.timesSeen + 1,
											timesAnswered: q.timesAnswered + (answer.trim() ? 1 : 0),
											averageScore:
												(q.averageScore * q.timesAnswered + (answerObj.aiScore || 0)) /
												(q.timesAnswered + 1),
											averageWordCount:
												(q.averageWordCount * q.timesAnswered + answerObj.wordCount) /
												(q.timesAnswered + 1),
											averageResponseTime:
												(q.averageResponseTime * q.timesAnswered + timeSpent) /
												(q.timesAnswered + 1),
										}
									: q
							);

							// Update or add answer to the list
							const existingAnswerIndex = state.progress.answers.findIndex(
								(a) => a.questionId === questionId
							);
							const updatedAnswers = [...state.progress.answers];

							if (existingAnswerIndex >= 0) {
								updatedAnswers[existingAnswerIndex] = answerObj;
							} else {
								updatedAnswers.push(answerObj);
							}

							// Calculate progress metrics
							const answeredCount = updatedAnswers.filter((a) => a.userAnswer.trim()).length;
							const skippedCount = updatedAnswers.filter((a) => !a.userAnswer.trim()).length;
							const totalWordCount = updatedAnswers.reduce((sum, a) => sum + a.wordCount, 0);
							const totalScore = updatedAnswers.reduce((sum, a) => sum + (a.aiScore || 0), 0);

							const updatedProgress: OpenQuestionProgress = {
								...state.progress,
								answeredQuestions: answeredCount,
								skippedQuestions: skippedCount,
								timeSpent: state.progress.timeSpent + timeSpent,
								lastUpdated: new Date(),
								averageTimePerQuestion:
									answeredCount > 0 ? (state.progress.timeSpent + timeSpent) / answeredCount : 0,
								averageWordCount: answeredCount > 0 ? totalWordCount / answeredCount : 0,
								averageScore: answeredCount > 0 ? totalScore / answeredCount : 0,
								answers: updatedAnswers,
							};

							set({
								questions: updatedQuestions,
								progress: updatedProgress,
								isEvaluating: false,
							});
						} catch (error) {
							set({
								error: error instanceof Error ? error.message : "Failed to submit answer",
								isEvaluating: false,
							});
						}
					},

					editAnswer: async (questionId: string, newAnswer: string) => {
						const state = get();
						const answerIndex = state.progress.answers.findIndex(
							(a) => a.questionId === questionId
						);

						if (answerIndex >= 0) {
							const question = state.questions.find((q) => q.id === questionId);
							if (!question) return;

							try {
								set({ isEvaluating: true });

								const updatedAnswer = {
									...state.progress.answers[answerIndex],
									userAnswer: newAnswer,
									wordCount: newAnswer
										.trim()
										.split(/\s+/)
										.filter((w) => w.length > 0).length,
									timestamp: new Date(),
									evaluationStatus: "evaluating" as EvaluationStatus,
								};

								// Re-evaluate if AI evaluation is enabled
								if (state.config.enableAiEvaluation && newAnswer.trim()) {
									const evaluation = await simulateAiEvaluation(question, newAnswer);
									updatedAnswer.aiScore = evaluation.score;
									updatedAnswer.keywordMatches = evaluation.keywordMatches;
									updatedAnswer.feedback = evaluation.feedback;
									updatedAnswer.improvementSuggestions = evaluation.improvementSuggestions;
									updatedAnswer.evaluationStatus = "completed";
								} else {
									updatedAnswer.evaluationStatus = "completed";
									updatedAnswer.aiScore = newAnswer.trim() ? 0.5 : 0;
								}

								const updatedAnswers = [...state.progress.answers];
								updatedAnswers[answerIndex] = updatedAnswer;

								// Recalculate progress metrics
								const answeredCount = updatedAnswers.filter((a) => a.userAnswer.trim()).length;
								const totalWordCount = updatedAnswers.reduce((sum, a) => sum + a.wordCount, 0);
								const totalScore = updatedAnswers.reduce((sum, a) => sum + (a.aiScore || 0), 0);

								set({
									progress: {
										...state.progress,
										answers: updatedAnswers,
										averageWordCount: answeredCount > 0 ? totalWordCount / answeredCount : 0,
										averageScore: answeredCount > 0 ? totalScore / answeredCount : 0,
										lastUpdated: new Date(),
									},
									isEvaluating: false,
								});
							} catch (error) {
								set({
									error: error instanceof Error ? error.message : "Failed to update answer",
									isEvaluating: false,
								});
							}
						}
					},

					skipQuestion: () => {
						const state = get();
						if (state.currentQuestion) {
							get().actions.submitAnswer(state.currentQuestion.id, "", 0);
							get().actions.moveToNextQuestion();
						}
					},

					// Evaluation
					getEvaluationFeedback: (questionId: string) => {
						const state = get();
						return state.progress.answers.find((a) => a.questionId === questionId) || null;
					},

					// Progress tracking
					calculateProgress: () => {
						const state = get();
						return state.progress;
					},

					calculatePerformance: () => {
						const state = get();
						const { progress, questions } = state;
						const answers = progress.answers.filter((a) => a.userAnswer.trim());

						if (answers.length === 0) {
							return state.performance;
						}

						// Basic metrics
						const overallScore =
							answers.reduce((sum, a) => sum + (a.aiScore || 0), 0) / answers.length;
						const averageResponseTime =
							answers.reduce((sum, a) => sum + a.timeSpent, 0) / answers.length;
						const averageWordCount =
							answers.reduce((sum, a) => sum + a.wordCount, 0) / answers.length;

						// Difficulty breakdown
						const difficultyBreakdown = {
							easy: { attempted: 0, averageScore: 0, averageWordCount: 0 },
							medium: { attempted: 0, averageScore: 0, averageWordCount: 0 },
							hard: { attempted: 0, averageScore: 0, averageWordCount: 0 },
						};

						for (const answer of answers) {
							const question = questions.find((q) => q.id === answer.questionId);
							if (question) {
								const difficulty = question.difficulty;
								difficultyBreakdown[difficulty].attempted++;
								difficultyBreakdown[difficulty].averageScore += answer.aiScore || 0;
								difficultyBreakdown[difficulty].averageWordCount += answer.wordCount;
							}
						}

						// Calculate averages for each difficulty
						for (const key of Object.keys(difficultyBreakdown)) {
							const difficulty = key as keyof typeof difficultyBreakdown;
							const data = difficultyBreakdown[difficulty];
							if (data.attempted > 0) {
								data.averageScore /= data.attempted;
								data.averageWordCount /= data.attempted;
							}
						}

						// Topic breakdown
						const topicBreakdown: Record<
							string,
							{
								attempted: number;
								averageScore: number;
								keyStrengths: string[];
								improvementAreas: string[];
							}
						> = {};

						for (const answer of answers) {
							const question = questions.find((q) => q.id === answer.questionId);
							if (question?.topic) {
								if (!topicBreakdown[question.topic]) {
									topicBreakdown[question.topic] = {
										attempted: 0,
										averageScore: 0,
										keyStrengths: [],
										improvementAreas: [],
									};
								}
								topicBreakdown[question.topic].attempted++;
								topicBreakdown[question.topic].averageScore += answer.aiScore || 0;

								// Add keyword matches as strengths
								if (answer.keywordMatches) {
									topicBreakdown[question.topic].keyStrengths.push(...answer.keywordMatches);
								}
							}
						}

						for (const topic of Object.keys(topicBreakdown)) {
							const data = topicBreakdown[topic];
							if (data.attempted > 0) {
								data.averageScore /= data.attempted;
								data.keyStrengths = [...new Set(data.keyStrengths)]; // Remove duplicates
							}
						}

						// Writing metrics (simplified)
						const allText = answers.map((a) => a.userAnswer).join(" ");
						const words = allText
							.toLowerCase()
							.split(/\W+/)
							.filter((w) => w.length > 0);
						const uniqueWords = new Set(words);
						const vocabularyDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;

						const sentences = allText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
						const averageSentenceLength =
							sentences.length > 0 ? words.length / sentences.length : 0;

						const allKeywords = questions.flatMap((q) => q.keywords || []);
						const usedKeywords = words.filter((word) =>
							allKeywords.some((keyword) => keyword.toLowerCase().includes(word))
						);
						const keywordUsage =
							allKeywords.length > 0 ? usedKeywords.length / allKeywords.length : 0;

						const writingMetrics = {
							vocabularyDiversity,
							averageSentenceLength,
							keywordUsage,
							clarity: overallScore, // Simplified - use overall score as clarity proxy
						};

						// Time efficiency and consistency
						const totalTimeMinutes = progress.timeSpent / (1000 * 60);
						const timeEfficiency = totalTimeMinutes > 0 ? answers.length / totalTimeMinutes : 0;

						const scores = answers.map((a) => a.aiScore || 0);
						const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
						const variance =
							scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length;
						const consistencyScore = 1 - Math.sqrt(variance); // Higher consistency = lower variance

						const performance: OpenQuestionPerformance = {
							overallScore,
							averageResponseTime,
							averageWordCount,
							wordCountTrend: 0, // Would need historical data
							scoreTrend: 0, // Would need historical data
							difficultyBreakdown,
							topicBreakdown,
							writingMetrics,
							timeEfficiency,
							consistencyScore: Math.max(0, consistencyScore),
						};

						set({ performance });
						return performance;
					},

					getSessionStats: () => {
						const state = get();
						const questionsAnswered = state.progress.answeredQuestions;
						const questionsRemaining = state.progress.totalQuestions - questionsAnswered;

						return {
							totalTime: state.progress.timeSpent,
							questionsAnswered,
							averageScore: state.progress.averageScore,
							questionsRemaining,
							averageWordCount: state.progress.averageWordCount,
						};
					},

					// Review and navigation
					getAnsweredQuestions: () => {
						const state = get();
						return state.progress.answers.filter((a) => a.userAnswer.trim());
					},

					getUnansweredQuestions: () => {
						const state = get();
						const answeredIds = new Set(state.progress.answers.map((a) => a.questionId));
						return state.questions.filter((q) => !answeredIds.has(q.id));
					},

					getFlaggedQuestions: () => {
						const state = get();
						const flaggedIds = new Set(state.progress.flaggedQuestions);
						return state.questions.filter((q) => flaggedIds.has(q.id));
					},

					getLowScoringAnswers: (threshold = 0.5) => {
						const state = get();
						return state.progress.answers.filter((a) => (a.aiScore || 0) < threshold);
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
				name: "open-question-session-store",
				version: 1,
				partialize: (state) => ({
					id: state.id,
					status: state.status,
					config: state.config,
					questions: state.questions,
					progress: state.progress,
					performance: state.performance,
					currentQuestion: state.currentQuestion,
					lastSyncedAt: state.lastSyncedAt,
				}),
			}
		)
	)
);

export { useOpenQuestionSession };
export type { OpenQuestionSessionStore };
