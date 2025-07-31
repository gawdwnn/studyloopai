// Recharts configuration and TypeScript-friendly utilities

import type { ContentType } from "@/components/analytics/chart-layout";
import type {
	ChartColorScheme,
	ContentTypeChartConfig,
} from "@/types/chart-types";

// Chart margin configurations for different layouts
export const CHART_MARGINS = {
	compact: { top: 20, right: 30, bottom: 40, left: 40 },
	normal: { top: 30, right: 40, bottom: 50, left: 50 },
	spacious: { top: 40, right: 60, bottom: 70, left: 70 },
	large: { top: 40, right: 80, bottom: 80, left: 80 },
} as const;

// Content-type specific chart configurations
export const CONTENT_TYPE_CHART_CONFIG: ContentTypeChartConfig = {
	cuecard: {
		colors: {
			primary: "#3B82F6", // blue-500
			secondary: "#93C5FD", // blue-300
			accent: "#DBEAFE", // blue-100
			success: "#10B981", // emerald-500
			error: "#EF4444", // red-500
			warning: "#F59E0B", // amber-500
			muted: "#6B7280", // gray-500
		},
		thresholds: {
			responseTime: { easy: 5, medium: 10 },
		},
		metrics: ["Memory Strength", "Response Speed", "Consistency", "Retention"],
	},
	mcq: {
		colors: {
			primary: "#10B981", // emerald-500
			secondary: "#6EE7B7", // emerald-300
			accent: "#D1FAE5", // emerald-100
			success: "#22C55E", // green-500
			error: "#EF4444", // red-500
			warning: "#F59E0B", // amber-500
			muted: "#6B7280", // gray-500
		},
		thresholds: {
			responseTime: { easy: 10, medium: 20 },
		},
		metrics: ["Accuracy", "Decision Speed", "Elimination Skills", "Confidence"],
	},
	open_question: {
		colors: {
			primary: "#8B5CF6", // violet-500
			secondary: "#C4B5FD", // violet-300
			accent: "#EDE9FE", // violet-100
			success: "#10B981", // emerald-500
			error: "#EF4444", // red-500
			warning: "#F59E0B", // amber-500
			muted: "#6B7280", // gray-500
		},
		thresholds: {
			responseTime: { easy: 30, medium: 60 },
		},
		metrics: ["Depth", "Clarity", "Organization", "Critical Thinking"],
	},
} as const;

// Utility function to get content-type specific colors
export function getContentTypeColors(
	contentType: ContentType
): ChartColorScheme {
	return CONTENT_TYPE_CHART_CONFIG[contentType].colors;
}

// Utility function to get content-type specific thresholds
export function getContentTypeThresholds(contentType: ContentType) {
	return CONTENT_TYPE_CHART_CONFIG[contentType].thresholds;
}

// Common chart formatting utilities
export const CHART_FORMATTERS = {
	percentage: (value: number) => `${Math.round(value)}%`,
	timeInSeconds: (seconds: number) => {
		const minutes = Math.floor(seconds / 60);
		return minutes > 0
			? `${minutes}m ${Math.round(seconds % 60)}s`
			: `${Math.round(seconds)}s`;
	},
	difficulty: (difficulty: "easy" | "medium" | "hard") => {
		const labels = { easy: "Easy", medium: "Medium", hard: "Hard" };
		return labels[difficulty];
	},
	number: (value: number, decimals = 0) => {
		return value.toFixed(decimals);
	},
	shortText: (text: string, maxLength = 30) => {
		return text.length > maxLength
			? `${text.substring(0, maxLength)}...`
			: text;
	},
} as const;
