"use client";

import { cn } from "@/lib/utils";
import { type ReactNode, useEffect, useState } from "react";

// Chart container sizes for large viewport optimization - MUCH LARGER
export const CHART_SIZES = {
	desktop: {
		primary: { width: "100%", height: "85vh", minHeight: "800px" },
		secondary: { width: "100%", height: "400px", minHeight: "350px" },
		tertiary: { width: "100%", height: "350px", minHeight: "300px" },
	},
	tablet: {
		primary: { width: "100%", height: "80vh", minHeight: "700px" },
		secondary: { width: "100%", height: "350px", minHeight: "300px" },
		tertiary: { width: "100%", height: "300px", minHeight: "250px" },
	},
	mobile: {
		primary: { width: "100%", height: "75vh", minHeight: "600px" },
		secondary: { width: "100%", height: "350px", minHeight: "250px" },
		tertiary: { width: "100%", height: "300px", minHeight: "200px" },
	},
} as const;

// Content-type specific color schemes
export const CHART_THEMES = {
	cuecard: {
		primary: "#3B82F6", // blue-500
		secondary: "#93C5FD", // blue-300
		accent: "#DBEAFE", // blue-100
		success: "#10B981", // emerald-500
		error: "#EF4444", // red-500
		warning: "#F59E0B", // amber-500
	},
	mcq: {
		primary: "#10B981", // emerald-500
		secondary: "#6EE7B7", // emerald-300
		accent: "#D1FAE5", // emerald-100
		success: "#22C55E", // green-500
		error: "#EF4444", // red-500
		warning: "#F59E0B", // amber-500
	},
	open_question: {
		primary: "#8B5CF6", // violet-500
		secondary: "#C4B5FD", // violet-300
		accent: "#EDE9FE", // violet-100
		success: "#10B981", // emerald-500
		error: "#EF4444", // red-500
		warning: "#F59E0B", // amber-500
	},
} as const;

export type ContentType = keyof typeof CHART_THEMES;
export type ChartPriority = "primary" | "secondary" | "tertiary";

interface ChartContainerProps {
	children: ReactNode;
	priority?: ChartPriority;
	className?: string;
}

/**
 * Chart container with responsive sizing based on priority
 * Optimized for large viewports to maximize data visibility
 */
export function ChartContainer({
	children,
	priority = "primary",
	className,
}: ChartContainerProps) {
	return (
		<div
			className={cn(
				"w-full relative bg-background rounded-lg border",
				// Desktop sizes - MUCH LARGER using viewport height
				"lg:h-[85vh] lg:min-h-[800px]",
				priority === "secondary" && "lg:h-[400px] lg:min-h-[350px]",
				priority === "tertiary" && "lg:h-[350px] lg:min-h-[300px]",
				// Tablet sizes - Large viewport height
				"md:h-[80vh] md:min-h-[700px]",
				priority === "secondary" && "md:h-[350px] md:min-h-[300px]",
				priority === "tertiary" && "md:h-[300px] md:min-h-[250px]",
				// Mobile sizes - Large viewport height
				"h-[75vh] min-h-[600px]",
				priority === "secondary" && "h-[350px] min-h-[250px]",
				priority === "tertiary" && "h-[300px] min-h-[200px]",
				className
			)}
		>
			{children}
		</div>
	);
}

interface ChartLayoutProps {
	children: ReactNode;
	className?: string;
}

/**
 * Main chart layout container
 * Single column, full-width layout with generous spacing
 */
export function ChartLayout({ children, className }: ChartLayoutProps) {
	return (
		<div
			className={cn(
				"w-full max-w-[1600px] mx-auto", // Wider max width for large charts
				"px-2 sm:px-4 lg:px-6", // Even more minimal side padding
				"space-y-4 lg:space-y-6", // Reduced vertical spacing for more chart space
				className
			)}
		>
			{children}
		</div>
	);
}

interface ChartGridProps {
	children: ReactNode;
	columns?: 1 | 2;
	className?: string;
}

/**
 * Grid layout for multiple charts
 * Defaults to single column for maximum chart width
 */
export function ChartGrid({
	children,
	columns = 1,
	className,
}: ChartGridProps) {
	return (
		<div
			className={cn(
				"grid gap-6 lg:gap-8",
				columns === 1 && "grid-cols-1",
				columns === 2 && "grid-cols-1 lg:grid-cols-2",
				className
			)}
		>
			{children}
		</div>
	);
}

// Responsive breakpoint hooks
export function useChartBreakpoint() {
	const [breakpoint, setBreakpoint] = useState<"mobile" | "tablet" | "desktop">(
		"desktop"
	);

	useEffect(() => {
		const checkBreakpoint = () => {
			const width = window.innerWidth;
			if (width < 768) {
				setBreakpoint("mobile");
			} else if (width < 1024) {
				setBreakpoint("tablet");
			} else {
				setBreakpoint("desktop");
			}
		};

		// Check on mount
		checkBreakpoint();

		// Add event listener
		window.addEventListener("resize", checkBreakpoint);

		// Cleanup
		return () => window.removeEventListener("resize", checkBreakpoint);
	}, []);

	return breakpoint;
}

// Get chart configuration based on content type
export function getChartConfig(contentType: ContentType) {
	return {
		colors: CHART_THEMES[contentType],
		animations: contentType === "cuecard" ? "smooth" : "spring",
		tooltips: {
			// Content-specific tooltip configurations
			showDelay: contentType === "open_question" ? 300 : 0,
			hideDelay: 100,
		},
	};
}
