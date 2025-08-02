import type {
	CrossSessionAnalytics,
	SessionHistoryEntry,
	SessionRecommendation,
} from "./types";

/**
 * Generate AI-powered session recommendations based on analytics
 */
export async function generateSmartRecommendations(
	analytics: CrossSessionAnalytics
): Promise<SessionRecommendation[]> {
	// TODO: Implement AI-powered recommendation generation
	// This would analyze:
	// - Learning patterns and weak areas
	// - Session type balance and preferences
	// - Time of day productivity patterns
	// - Available content types (from generation config)

	// Placeholder implementation
	const recommendations: SessionRecommendation[] = [];

	// Example recommendation structure
	if (analytics.learningPatterns.weakestTopics.length > 0) {
		recommendations.push({
			type: "cuecards",
			reason: `Focus on ${analytics.learningPatterns.weakestTopics[0]} to improve understanding`,
			config: {
				courseId: "current",
				weeks: [],
			},
			estimatedDuration: 15,
			priority: "high",
			benefits: ["Target weak areas", "Build confidence", "Improve retention"],
		});
	}

	// Return empty array until proper implementation
	return recommendations;
}

/**
 * Calculate current learning streak (consecutive days with completed sessions)
 */
export function calculateCurrentStreak(
	history: SessionHistoryEntry[],
	today: Date
): number {
	const sortedSessions = history
		.filter((session) => session.status === "completed")
		.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

	let streak = 0;
	const currentDate = new Date(today);
	currentDate.setHours(0, 0, 0, 0);

	for (const session of sortedSessions) {
		const sessionDate = new Date(session.startedAt);
		sessionDate.setHours(0, 0, 0, 0);

		if (sessionDate.getTime() === currentDate.getTime()) {
			streak++;
			currentDate.setDate(currentDate.getDate() - 1);
		} else if (sessionDate.getTime() < currentDate.getTime()) {
			break;
		}
	}

	return streak;
}

/**
 * Calculate the longest learning streak in session history
 */
export function calculateLongestStreak(history: SessionHistoryEntry[]): number {
	const completedSessions = history
		.filter((session) => session.status === "completed")
		.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

	if (completedSessions.length === 0) return 0;

	let longestStreak = 0;
	let currentStreak = 1;
	let lastDate = new Date(completedSessions[0].startedAt);
	lastDate.setHours(0, 0, 0, 0);

	for (let i = 1; i < completedSessions.length; i++) {
		const sessionDate = new Date(completedSessions[i].startedAt);
		sessionDate.setHours(0, 0, 0, 0);

		const dayDifference =
			(sessionDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

		if (dayDifference === 1) {
			currentStreak++;
		} else {
			longestStreak = Math.max(longestStreak, currentStreak);
			currentStreak = 1;
		}

		lastDate = sessionDate;
	}

	return Math.max(longestStreak, currentStreak);
}

/**
 * Calculate weekly progress towards daily goal
 */
export function calculateWeeklyProgress(
	history: SessionHistoryEntry[],
	today: Date,
	dailyGoal: number
): number {
	const weekStart = new Date(today);
	weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
	weekStart.setHours(0, 0, 0, 0);

	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekStart.getDate() + 6);
	weekEnd.setHours(23, 59, 59, 999);

	const weekSessions = history.filter(
		(session) =>
			session.startedAt >= weekStart &&
			session.startedAt <= weekEnd &&
			session.status === "completed"
	);

	const targetSessions = dailyGoal * 7;
	return targetSessions > 0
		? Math.min((weekSessions.length / targetSessions) * 100, 100)
		: 0;
}
