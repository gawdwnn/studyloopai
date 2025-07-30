"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { CHART_FORMATTERS, CHART_MARGINS } from "@/lib/charts/recharts-config";
import { cn } from "@/lib/utils";
import type {
	ChartColorScheme,
	CustomDotData,
	CustomTooltipData,
} from "@/types/chart-types";
import type { SessionAnalytics } from "@/types/session-analytics";
import { Brain, Clock, Target } from "lucide-react";
import {
	Area,
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { transformToTimelineData } from "./chart-data-adapters";
import type { ContentType } from "./chart-layout";

interface PerformanceTimelineProps {
	data: SessionAnalytics;
	contentType: ContentType;
	colors: ChartColorScheme;
	className?: string;
}

// Legacy function - now using chart data adapters for content-type aware transformations

// Custom dot component for accuracy indicators
function CustomDot(props: CustomDotData & { colors: ChartColorScheme }) {
	const { cx, cy, payload, colors } = props;
	if (!payload.isCorrect) {
		return (
			<g>
				<circle cx={cx} cy={cy} r={6} fill={colors.error} opacity={0.8} />
				<circle cx={cx} cy={cy} r={3} fill="white" />
			</g>
		);
	}
	return <circle cx={cx} cy={cy} r={4} fill={colors.success} />;
}

// Enhanced tooltip with question preview
function CustomTooltip({ active, payload, label }: CustomTooltipData) {
	if (!active || !payload || !payload[0]) return null;

	const data = payload[0].payload;

	return (
		<div className="bg-background border rounded-lg shadow-lg p-3 space-y-2">
			<p className="font-medium text-sm">Question {label}</p>
			<p className="text-xs text-muted-foreground max-w-[200px] line-clamp-2">
				{data.question}
			</p>
			<div className="space-y-1 pt-1 border-t">
				<div className="flex items-center justify-between gap-4">
					<span className="text-xs text-muted-foreground">Result:</span>
					<span
						className={cn(
							"text-xs font-medium",
							data.isCorrect ? "text-green-600" : "text-red-600"
						)}
					>
						{data.isCorrect ? "Correct" : "Incorrect"}
					</span>
				</div>
				<div className="flex items-center justify-between gap-4">
					<span className="text-xs text-muted-foreground">Time:</span>
					<span className="text-xs">
						{CHART_FORMATTERS.timeInSeconds(data.responseTime)}
					</span>
				</div>
				<div className="flex items-center justify-between gap-4">
					<span className="text-xs text-muted-foreground">Rolling Avg:</span>
					<span className="text-xs">
						{CHART_FORMATTERS.percentage(data.rollingAccuracy)}
					</span>
				</div>
			</div>
		</div>
	);
}

export function PerformanceTimeline({
	data,
	contentType,
	colors,
	className,
}: PerformanceTimelineProps) {
	// Use chart data adapters for content-type aware data transformation
	const timelineData = transformToTimelineData(data, contentType);
	const avgResponseTime = data.performanceMetrics.averageResponseTime / 1000;
	const finalAccuracy = data.session.accuracy;

	// Get content-type specific configuration from adapters (for potential future use)
	// const contentConfig = getContentTypeConfig(contentType);

	// Content-type specific UI configurations
	const chartUIConfig = {
		cuecard: {
			showDifficulty: true,
			icon: Brain,
		},
		mcq: {
			showDifficulty: true,
			icon: Target,
		},
		open_question: {
			showDifficulty: false, // Open questions have variable times
			icon: Clock,
		},
	};

	const uiConfig = chartUIConfig[contentType];
	const Icon = uiConfig.icon;

	return (
		<Card className={cn("h-full border-0", className)}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Icon className="w-5 h-5" />
					Performance Timeline
				</CardTitle>
				<CardDescription>
					Question-by-question performance with accuracy and response time
					analysis
				</CardDescription>
			</CardHeader>
			<CardContent className="h-[calc(100%-5rem)] p-6">
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart data={timelineData} margin={CHART_MARGINS.large}>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke={colors.muted}
							opacity={0.3}
						/>

						{/* X-Axis - Question sequence */}
						<XAxis
							dataKey="sequence"
							label={{
								value: "Question Sequence",
								position: "insideBottom",
								offset: -10,
							}}
							stroke={colors.muted}
						/>

						{/* Dual Y-Axis */}
						<YAxis
							yAxisId="accuracy"
							domain={[0, 100]}
							label={{
								value: "Accuracy %",
								angle: -90,
								position: "insideLeft",
							}}
							stroke={colors.muted}
						/>
						<YAxis
							yAxisId="time"
							orientation="right"
							label={{
								value: "Response Time (s)",
								angle: 90,
								position: "insideRight",
							}}
							stroke={colors.muted}
						/>

						{/* Enhanced tooltip */}
						<Tooltip content={<CustomTooltip />} />

						{/* Legend */}
						<Legend verticalAlign="top" height={36} iconType="line" />

						{/* Response time as area chart */}
						<Area
							yAxisId="time"
							type="monotone"
							dataKey="responseTime"
							stroke={colors.primary}
							fill={colors.primary}
							fillOpacity={0.2}
							strokeWidth={2}
							name="Response Time"
						/>

						{/* Individual accuracy as bars */}
						<Bar
							yAxisId="accuracy"
							dataKey="accuracy"
							fill={colors.accent}
							fillOpacity={0.6}
							name="Accuracy"
						/>

						{/* Rolling accuracy trend line */}
						<Line
							yAxisId="accuracy"
							type="monotone"
							dataKey="rollingAccuracy"
							stroke={colors.success}
							strokeWidth={3}
							dot={false}
							name="Rolling Average"
						/>

						{/* Custom dots for correct/incorrect */}
						<Line
							yAxisId="accuracy"
							dataKey="accuracy"
							stroke="transparent"
							dot={(props) => <CustomDot {...props} colors={colors} />}
						/>

						{/* Reference lines */}
						<ReferenceLine
							yAxisId="accuracy"
							y={finalAccuracy}
							stroke={colors.warning}
							strokeDasharray="5 5"
							label={{
								value: `Session Avg: ${CHART_FORMATTERS.percentage(finalAccuracy)}`,
								position: "left",
							}}
						/>
						<ReferenceLine
							yAxisId="time"
							y={avgResponseTime}
							stroke={colors.secondary}
							strokeDasharray="5 5"
							label={{
								value: `Avg Time: ${CHART_FORMATTERS.timeInSeconds(avgResponseTime)}`,
								position: "right",
							}}
						/>
					</ComposedChart>
				</ResponsiveContainer>

				{/* Performance summary badges */}
				<div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded-full bg-green-500" />
						<span className="text-xs text-muted-foreground">Correct</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded-full bg-red-500" />
						<span className="text-xs text-muted-foreground">Incorrect</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 to-blue-300" />
						<span className="text-xs text-muted-foreground">Response Time</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-12 h-0.5 bg-green-500" />
						<span className="text-xs text-muted-foreground">Rolling Avg</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
