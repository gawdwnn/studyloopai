import type {
	McqAnswer,
	McqPerformance,
	McqProgress,
	McqQuestion,
} from "../stores/types";

/**
 * Calculate the score for an individual MCQ answer
 */
export function calculateAnswerScore(
	answer: McqAnswer,
	question: McqQuestion
): number {
	if (!answer.isCorrect) return 0;

	// Base score for correct answer
	let score = 100;

	// Difficulty multiplier
	const difficultyMultipliers = { easy: 1.0, medium: 1.2, hard: 1.5 };
	score *= difficultyMultipliers[question.difficulty];

	// Time bonus/penalty (assuming reasonable time is 30-120 seconds)
	const timeSpent = answer.timeSpent / 1000; // Convert to seconds
	const optimalTime = 60; // 60 seconds as optimal

	if (timeSpent < optimalTime) {
		// Bonus for quick correct answers (up to 10% bonus)
		const timeBonus = Math.min(
			0.1,
			((optimalTime - timeSpent) / optimalTime) * 0.1
		);
		score *= 1 + timeBonus;
	} else if (timeSpent > optimalTime * 2) {
		// Penalty for very slow answers (up to 20% penalty)
		const timePenalty = Math.min(
			0.2,
			((timeSpent - optimalTime * 2) / (optimalTime * 3)) * 0.2
		);
		score *= 1 - timePenalty;
	}

	// Confidence alignment bonus (if confidence matches correctness)
	if (answer.confidenceLevel >= 4) {
		score *= 1.05; // 5% bonus for high confidence on correct answer
	}

	return Math.round(score);
}

/**
 * Calculate overall session performance metrics
 */
export function calculateSessionPerformance(
	answers: McqAnswer[],
	questions: McqQuestion[]
): McqPerformance {
	if (answers.length === 0) {
		return {
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
	}

	const correctAnswers = answers.filter((a) => a.isCorrect).length;
	const accuracy = (correctAnswers / answers.length) * 100;

	const totalTime = answers.reduce((sum, answer) => sum + answer.timeSpent, 0);
	const averageResponseTime = totalTime / answers.length;

	// Calculate difficulty breakdown
	const difficultyBreakdown = {
		easy: { attempted: 0, correct: 0, accuracy: 0 },
		medium: { attempted: 0, correct: 0, accuracy: 0 },
		hard: { attempted: 0, correct: 0, accuracy: 0 },
	};

	for (const answer of answers) {
		const question = questions.find((q) => q.id === answer.questionId);
		if (question) {
			// Ensure difficulty is valid, default to medium if not
			const validDifficulty = ["easy", "medium", "hard"].includes(
				question.difficulty
			)
				? (question.difficulty as keyof typeof difficultyBreakdown)
				: "medium";

			difficultyBreakdown[validDifficulty].attempted++;
			if (answer.isCorrect) {
				difficultyBreakdown[validDifficulty].correct++;
			}
		}
	}

	// Calculate accuracy for each difficulty
	for (const difficulty of Object.keys(difficultyBreakdown)) {
		const data =
			difficultyBreakdown[difficulty as keyof typeof difficultyBreakdown];
		data.accuracy =
			data.attempted > 0 ? (data.correct / data.attempted) * 100 : 0;
	}

	// Calculate topic breakdown
	const topicBreakdown: Record<
		string,
		{ attempted: number; correct: number; accuracy: number }
	> = {};

	for (const answer of answers) {
		const question = questions.find((q) => q.id === answer.questionId);
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

	// Calculate accuracy for each topic
	for (const topic of Object.keys(topicBreakdown)) {
		const data = topicBreakdown[topic];
		data.accuracy =
			data.attempted > 0 ? (data.correct / data.attempted) * 100 : 0;
	}

	// Time efficiency (questions per minute)
	const totalTimeMinutes = totalTime / (1000 * 60);
	const timeEfficiency =
		totalTimeMinutes > 0 ? answers.length / totalTimeMinutes : 0;

	// Confidence accuracy correlation
	const confidenceAccuracy = calculateConfidenceAccuracy(answers);

	// Improvement trend (simplified - would need historical data for full implementation)
	const improvementTrend = calculateImprovementTrend(answers);

	return {
		accuracy,
		averageResponseTime,
		difficultyBreakdown,
		topicBreakdown,
		timeEfficiency,
		confidenceAccuracy,
		improvementTrend,
	};
}

/**
 * Calculate confidence accuracy correlation
 */
function calculateConfidenceAccuracy(answers: McqAnswer[]): number {
	const answersWithConfidence = answers.filter((a) => a.confidenceLevel > 0);
	if (answersWithConfidence.length === 0) return 0;

	let correlationSum = 0;
	for (const answer of answersWithConfidence) {
		const confidenceNormalized = answer.confidenceLevel / 5; // Normalize to 0-1
		const correctnessScore = answer.isCorrect ? 1 : 0;
		correlationSum += Math.abs(confidenceNormalized - correctnessScore);
	}

	// Convert to positive correlation (lower difference = higher correlation)
	const averageDifference = correlationSum / answersWithConfidence.length;
	return Math.max(0, (1 - averageDifference) * 100);
}

/**
 * Calculate improvement trend based on answer sequence
 */
function calculateImprovementTrend(answers: McqAnswer[]): number {
	if (answers.length < 5) return 0; // Need sufficient data

	const firstHalf = answers.slice(0, Math.floor(answers.length / 2));
	const secondHalf = answers.slice(Math.floor(answers.length / 2));

	const firstHalfAccuracy =
		(firstHalf.filter((a) => a.isCorrect).length / firstHalf.length) * 100;
	const secondHalfAccuracy =
		(secondHalf.filter((a) => a.isCorrect).length / secondHalf.length) * 100;

	return secondHalfAccuracy - firstHalfAccuracy;
}

/**
 * Calculate progress metrics
 * @param sessionElapsedTime - Optional session elapsed time in milliseconds from store timer
 */
export function calculateProgress(
	answers: McqAnswer[],
	totalQuestions: number,
	startTime: Date,
	sessionElapsedTime?: number
): McqProgress {
	const timeSpent = sessionElapsedTime ?? Date.now() - startTime.getTime();

	const correctAnswers = answers.filter((a) => a.isCorrect).length;
	const incorrectAnswers = answers.filter(
		(a) => !a.isCorrect && a.selectedAnswer !== null
	).length;
	const skippedQuestions = answers.filter(
		(a) => a.selectedAnswer === null
	).length;

	const averageTimePerQuestion =
		answers.length > 0
			? answers.reduce((sum, a) => sum + a.timeSpent, 0) / answers.length
			: 0;

	return {
		currentIndex: answers.length,
		totalQuestions,
		correctAnswers,
		incorrectAnswers,
		skippedQuestions,
		timeSpent,
		startedAt: startTime,
		lastUpdated: new Date(),
		averageTimePerQuestion,
		answers,
		flaggedQuestions: [], // Will be managed by session store
	};
}

/**
 * Calculate weighted score based on difficulty and performance
 */
export function calculateWeightedScore(
	answers: McqAnswer[],
	questions: McqQuestion[]
): number {
	if (answers.length === 0) return 0;

	const totalWeightedScore = answers.reduce((sum, answer) => {
		const question = questions.find((q) => q.id === answer.questionId);
		if (!question) return sum;

		return sum + calculateAnswerScore(answer, question);
	}, 0);

	// Calculate maximum possible score
	const maxPossibleScore = questions
		.filter((q) => answers.some((a) => a.questionId === q.id))
		.reduce((sum, question) => {
			const difficultyMultipliers = { easy: 1.0, medium: 1.2, hard: 1.5 };
			return sum + 100 * difficultyMultipliers[question.difficulty] * 1.15; // Max with bonuses
		}, 0);

	return maxPossibleScore > 0
		? (totalWeightedScore / maxPossibleScore) * 100
		: 0;
}

/**
 * Get session statistics summary
 */
export function getSessionStats(progress: McqProgress) {
	const { currentIndex, correctAnswers, timeSpent } = progress;

	return {
		totalTime: timeSpent,
		itemsCompleted: currentIndex,
		accuracy: currentIndex > 0 ? (correctAnswers / currentIndex) * 100 : 0,
		score: currentIndex > 0 ? (correctAnswers / currentIndex) * 100 : 0, // Same as accuracy for MCQs
	};
}
