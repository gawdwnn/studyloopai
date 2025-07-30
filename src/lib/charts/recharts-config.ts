// Recharts configuration and TypeScript-friendly utilities

import type { ContentType } from "@/components/analytics/chart-layout";
import type {
	ChartAnimationConfig,
	ChartColorScheme,
	ChartConfig,
	ContentTypeChartConfig,
	ResponsiveBreakpoints,
} from "@/types/chart-types";

// Default animation configurations for different chart types
export const CHART_ANIMATIONS: Record<string, ChartAnimationConfig> = {
	timeline: {
		duration: 1000,
		easing: "ease-in-out",
		delay: 100,
	},
	pie: {
		duration: 800,
		easing: "ease-out",
		delay: 0,
	},
	bar: {
		duration: 600,
		easing: "ease-in-out",
		delay: 50,
	},
	line: {
		duration: 1200,
		easing: "ease-in-out",
		delay: 0,
	},
	area: {
		duration: 1000,
		easing: "ease-out",
		delay: 0,
	},
	radar: {
		duration: 800,
		easing: "ease-in-out",
		delay: 200,
	},
} as const;

// Responsive breakpoints for chart sizing
export const RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoints = {
	mobile: {
		width: "100%",
		height: "75vh",
		minHeight: 400,
		maxHeight: 600,
	},
	tablet: {
		width: "100%",
		height: "80vh",
		minHeight: 500,
		maxHeight: 700,
	},
	desktop: {
		width: "100%",
		height: "85vh",
		minHeight: 600,
		maxHeight: 1000,
	},
} as const;

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

// Default chart configuration factory
export function createChartConfig(contentType: ContentType): ChartConfig {
	const contentConfig = CONTENT_TYPE_CHART_CONFIG[contentType];

	return {
		colors: contentConfig.colors,
		animations: contentType === "cuecard" ? "smooth" : "spring",
		tooltips: {
			showDelay: contentType === "open_question" ? 300 : 0,
			hideDelay: 100,
		},
		responsive: true,
		accessibility: {
			title: `${contentType} Performance Analytics`,
			description: `Interactive chart showing ${contentType} session performance data`,
		},
	};
}

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

// Utility function to get content-type specific metrics
export function getContentTypeMetrics(contentType: ContentType): string[] {
	return CONTENT_TYPE_CHART_CONFIG[contentType].metrics;
}

// Chart grid configuration for different layouts
export const CHART_GRID_CONFIGS = {
	single: "grid-cols-1",
	dual: "grid-cols-1 lg:grid-cols-2",
	triple: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
	quad: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
} as const;

// Common chart formatting utilities
export const CHART_FORMATTERS = {
	percentage: (value: number) => `${Math.round(value)}%`,
	time: (milliseconds: number) => {
		const seconds = Math.floor(milliseconds / 1000);
		const minutes = Math.floor(seconds / 60);
		return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
	},
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

// Chart accessibility helpers
export const CHART_ARIA_LABELS = {
	timeline:
		"Performance timeline showing accuracy and response time for each question",
	difficulty: "Pie chart showing distribution of question difficulty levels",
	accuracy: "Line chart showing accuracy progression throughout the session",
	gaps: "Matrix chart highlighting learning gaps and problem areas",
	radar: "Radar chart displaying performance across multiple metrics",
	schedule: "Bar chart showing upcoming review schedule for spaced repetition",
} as const;

// Chart keyboard navigation support
export const CHART_KEYBOARD_SHORTCUTS = {
	zoom: {
		in: ["+=", "NumpadAdd"],
		out: ["-", "NumpadSubtract"],
		reset: ["0", "Numpad0"],
	},
	navigation: {
		left: ["ArrowLeft"],
		right: ["ArrowRight"],
		up: ["ArrowUp"],
		down: ["ArrowDown"],
	},
	selection: {
		select: ["Enter", " "],
		escape: ["Escape"],
	},
} as const;

// Export configuration for charts
export const CHART_EXPORT_CONFIG = {
	formats: ["png", "jpg", "svg"] as const,
	defaultFormat: "png" as const,
	quality: 0.9,
	scale: 2,
	backgroundColor: "#ffffff",
} as const;

// Chart loading skeleton configurations
export const CHART_SKELETON_CONFIG = {
	timeline: {
		elements: [
			{ type: "rect", width: "100%", height: "20px", y: "10%" },
			{ type: "rect", width: "100%", height: "60%", y: "25%" },
			{ type: "rect", width: "80%", height: "10px", y: "90%" },
		],
	},
	pie: {
		elements: [{ type: "circle", cx: "50%", cy: "50%", r: "40%" }],
	},
	bar: {
		elements: [
			{ type: "rect", width: "15%", height: "60%", x: "10%", y: "30%" },
			{ type: "rect", width: "15%", height: "80%", x: "30%", y: "10%" },
			{ type: "rect", width: "15%", height: "40%", x: "50%", y: "50%" },
			{ type: "rect", width: "15%", height: "70%", x: "70%", y: "20%" },
		],
	},
} as const;

// Error boundary configuration for charts
export const CHART_ERROR_CONFIG = {
	fallbackHeight: 400,
	retryAttempts: 3,
	retryDelay: 1000,
	showDetails: process.env.NODE_ENV === "development",
} as const;
