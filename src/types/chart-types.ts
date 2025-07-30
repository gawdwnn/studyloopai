// TypeScript types for Recharts integration and chart components

import type { ContentType } from "@/components/analytics/chart-layout";

// Base chart configuration types
export interface ChartConfig {
	colors: ChartColorScheme;
	animations: "smooth" | "spring" | "none";
	tooltips: {
		showDelay: number;
		hideDelay: number;
	};
	responsive: boolean;
	accessibility: {
		description: string;
		title: string;
	};
}

export interface ChartColorScheme {
	primary: string;
	secondary: string;
	accent: string;
	success: string;
	error: string;
	warning: string;
	muted: string;
}

// Recharts-specific prop types for our custom components
export interface CustomTooltipData {
	active?: boolean;
	payload?: Array<{
		payload: Record<string, unknown>;
		value: number;
		dataKey: string;
		color: string;
		name: string;
	}>;
	label?: string | number;
	coordinate?: { x: number; y: number };
}

export interface CustomDotData {
	cx: number;
	cy: number;
	payload: {
		isCorrect: boolean;
		difficulty: "easy" | "medium" | "hard";
		accuracy: number;
		responseTime: number;
		sequence: number;
		question: string;
	};
}

export interface CustomLegendData {
	payload?: Array<{
		value: string;
		type: string;
		color: string;
		dataKey: string;
	}>;
}

// Chart data structure types
export interface TimelineChartData {
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

export interface DifficultyChartData {
	name: string;
	value: number;
	color: string;
	percentage: number;
}

export interface AccuracyProgressionData {
	sequence: number;
	accuracy: number;
	cumulative: number;
	responseTime?: number;
}

export interface GapMatrixData {
	contentId: string;
	question: string;
	category: string;
	severity: number;
	failureCount: number;
	lastAttempt: Date;
	difficulty: "easy" | "medium" | "hard";
	x: number; // Matrix position
	y: number; // Matrix position
}

export interface ReviewScheduleData {
	contentId: string;
	question: string;
	daysUntilReview: number;
	easeFactor: number;
	intervalDays: number;
	difficulty: "easy" | "medium" | "hard";
}

// Chart component prop types
export interface BaseChartProps {
	data: Record<string, unknown>[];
	colors: ChartColorScheme;
	contentType: ContentType;
	className?: string;
	width?: number | string;
	height?: number | string;
	margin?: {
		top: number;
		right: number;
		bottom: number;
		left: number;
	};
}

export interface ResponsiveChartProps extends BaseChartProps {
	minHeight?: number;
	maxHeight?: number;
	aspectRatio?: number;
}

// Chart sizing and responsive types
export interface ChartDimensions {
	width: number | string;
	height: number | string;
	minHeight: number;
	maxHeight?: number;
}

export interface ResponsiveBreakpoints {
	mobile: ChartDimensions;
	tablet: ChartDimensions;
	desktop: ChartDimensions;
}

// Animation and interaction types
export interface ChartAnimationConfig {
	duration: number;
	easing: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
	delay?: number;
}

export interface ChartInteractionConfig {
	hover: boolean;
	click: boolean;
	zoom: boolean;
	pan: boolean;
	brush: boolean;
}

// Chart theme and styling types
export interface ChartTheme {
	name: string;
	colors: ChartColorScheme;
	fonts: {
		family: string;
		sizes: {
			small: number;
			medium: number;
			large: number;
		};
	};
	spacing: {
		padding: number;
		margin: number;
		gap: number;
	};
}

// Content-type specific chart configurations
export interface ContentTypeChartConfig {
	cuecard: {
		colors: ChartColorScheme;
		thresholds: {
			responseTime: { easy: number; medium: number };
		};
		metrics: string[];
	};
	mcq: {
		colors: ChartColorScheme;
		thresholds: {
			responseTime: { easy: number; medium: number };
		};
		metrics: string[];
	};
	open_question: {
		colors: ChartColorScheme;
		thresholds: {
			responseTime: { easy: number; medium: number };
		};
		metrics: string[];
	};
}

// Chart state management types
export interface ChartState {
	loading: boolean;
	error: string | null;
	data: Record<string, unknown>[];
	selectedDataPoint: Record<string, unknown> | null;
	zoomLevel: number;
	panOffset: { x: number; y: number };
}

// Chart event types
export interface ChartEventHandlers {
	onDataPointClick?: (data: Record<string, unknown>, index: number) => void;
	onDataPointHover?: (data: Record<string, unknown>, index: number) => void;
	onZoomChange?: (zoomLevel: number) => void;
	onPanChange?: (offset: { x: number; y: number }) => void;
	onLegendClick?: (dataKey: string, entry: Record<string, unknown>) => void;
}

// Export utility types for specific chart components
export type PerformanceTimelineData = TimelineChartData[];
export type DifficultyDistributionData = DifficultyChartData[];
export type LearningGapsMatrixData = GapMatrixData[];

// Chart loading and error states
export interface ChartLoadingProps {
	height?: number | string;
	className?: string;
}

export interface ChartErrorProps {
	error: Error | string;
	onRetry?: () => void;
	className?: string;
}

// Accessibility types
export interface ChartAccessibilityProps {
	title: string;
	description: string;
	ariaLabel?: string;
	role?: string;
	tabIndex?: number;
}

// Advanced chart features
export interface ChartExportConfig {
	formats: Array<"png" | "jpg" | "svg" | "pdf">;
	filename?: string;
	quality?: number;
	scale?: number;
}

export interface ChartFilterConfig {
	timeRange?: {
		start: Date;
		end: Date;
	};
	contentTypes?: ContentType[];
	difficultyLevels?: Array<"easy" | "medium" | "hard">;
	accuracyRange?: {
		min: number;
		max: number;
	};
}
