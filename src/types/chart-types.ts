// Chart color scheme configuration
export interface ChartColorScheme {
	primary: string;
	secondary: string;
	accent: string;
	success: string;
	error: string;
	warning: string;
	muted: string;
}

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

// Recharts-specific prop types for custom components
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

// Chart sizing and responsive types
export interface ResponsiveBreakpoints {
	mobile: {
		width: number | string;
		height: number | string;
		minHeight: number;
		maxHeight?: number;
	};
	tablet: {
		width: number | string;
		height: number | string;
		minHeight: number;
		maxHeight?: number;
	};
	desktop: {
		width: number | string;
		height: number | string;
		minHeight: number;
		maxHeight?: number;
	};
}

// Animation configuration types
export interface ChartAnimationConfig {
	duration: number;
	easing: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
	delay?: number;
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
