"use client";

import type { SessionAnalytics } from "@/types/session-analytics";
import type { ContentType } from "./chart-layout";

// Base chart data interfaces for different visualization types
export interface TimelineDataPoint {
	sequence: number;
	question: string;
	accuracy: number;
	responseTime: number;
	rollingAccuracy: number;
	difficulty: "easy" | "medium" | "hard";
	isCorrect: boolean;
	contentId: string;
	contentType: ContentType;
}

export interface DifficultyDataPoint {
	name: string;
	value: number;
	color: string;
	percentage: number;
}

// Content-type specific thresholds for difficulty categorization
const CONTENT_TYPE_CONFIG = {
	cuecard: {
		responseTimeThresholds: { easy: 5, medium: 10 }, // seconds
	},
	mcq: {
		responseTimeThresholds: { easy: 10, medium: 20 },
	},
	open_question: {
		responseTimeThresholds: { easy: 30, medium: 60 },
	},
} as const;

/**
 * Transforms session responses into timeline data for performance visualization
 * Works with any content type and adapts difficulty thresholds accordingly
 */
export function transformToTimelineData(
	analytics: SessionAnalytics,
	contentType: ContentType
): TimelineDataPoint[] {
	const config = CONTENT_TYPE_CONFIG[contentType];
	const { responses } = analytics;

	return responses.map((response, index) => {
		const sequence = index + 1;
		const accuracy = response.feedback === "correct" ? 100 : 0;
		const responseTimeSeconds = response.timeSpent / 1000;

		// Calculate rolling accuracy (last 5 responses for context)
		const windowSize = Math.min(5, responses.length);
		const startIdx = Math.max(0, index - windowSize + 1);
		const recentResponses = responses.slice(startIdx, index + 1);
		const rollingAccuracy =
			(recentResponses.filter((r) => r.feedback === "correct").length /
				recentResponses.length) *
			100;

		// Determine difficulty based on content-type specific thresholds
		const difficulty =
			responseTimeSeconds <= config.responseTimeThresholds.easy
				? "easy"
				: responseTimeSeconds <= config.responseTimeThresholds.medium
					? "medium"
					: "hard";

		return {
			sequence,
			question:
				response.question.substring(0, 50) +
				(response.question.length > 50 ? "..." : ""),
			accuracy,
			responseTime: responseTimeSeconds,
			rollingAccuracy,
			difficulty,
			isCorrect: response.feedback === "correct",
			contentId: response.contentId,
			contentType: response.contentType as ContentType,
		};
	});
}

/**
 * Transforms performance metrics into difficulty distribution data
 * Adapts categories and colors based on content type
 */
export function transformToDifficultyData(
	analytics: SessionAnalytics,
	_contentType: ContentType,
	colors: { success: string; warning: string; error: string }
): DifficultyDataPoint[] {
	const { performanceMetrics } = analytics;
	const distribution = performanceMetrics.difficultyDistribution;
	const total = Object.values(distribution).reduce(
		(sum, value) => sum + value,
		0
	);

	const colorMap = {
		easy: colors.success,
		medium: colors.warning,
		hard: colors.error,
	};

	return Object.entries(distribution).map(([key, value]) => ({
		name: key.charAt(0).toUpperCase() + key.slice(1),
		value,
		color: colorMap[key as keyof typeof colorMap] || colors.warning,
		percentage: total > 0 ? (value / total) * 100 : 0,
	}));
}
