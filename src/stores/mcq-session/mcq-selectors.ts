// MCQ Session Selector Functions
// Zustand-recommended pattern for computed values

import type { McqSessionStore } from "./types";

// Main progress selector with all computed values
export const selectMcqProgress = (state: McqSessionStore) => {
	const correctAnswers = state.progress.answers.filter(
		(a) => a.isCorrect
	).length;
	const incorrectAnswers = state.progress.answers.filter(
		(a) => !a.isCorrect && a.selectedAnswer !== null
	).length;
	const skippedQuestions = state.progress.answers.filter(
		(a) => a.selectedAnswer === null
	).length;

	const totalTime = state.progress.answers.reduce(
		(sum, answer) => sum + answer.timeSpent,
		0
	);
	const averageTimePerQuestion =
		state.progress.answers.length > 0
			? totalTime / state.progress.answers.length
			: 0;

	return {
		...state.progress,
		correctAnswers,
		incorrectAnswers,
		skippedQuestions,
		timeSpent: totalTime,
		averageTimePerQuestion,
		lastUpdated: new Date(),
	};
};

// Quick selectors for specific computed values
export const selectCorrectAnswers = (state: McqSessionStore) =>
	state.progress.answers.filter((a) => a.isCorrect).length;

export const selectIncorrectAnswers = (state: McqSessionStore) =>
	state.progress.answers.filter(
		(a) => !a.isCorrect && a.selectedAnswer !== null
	).length;

export const selectSkippedQuestions = (state: McqSessionStore) =>
	state.progress.answers.filter((a) => a.selectedAnswer === null).length;

export const selectTotalTimeSpent = (state: McqSessionStore) =>
	state.progress.answers.reduce((sum, answer) => sum + answer.timeSpent, 0);

export const selectAverageTimePerQuestion = (state: McqSessionStore) => {
	const totalTime = selectTotalTimeSpent(state);
	return state.progress.answers.length > 0
		? totalTime / state.progress.answers.length
		: 0;
};
