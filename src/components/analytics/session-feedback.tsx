"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	getContentTypeColors,
	getContentTypeThresholds,
} from "@/lib/charts/recharts-config";
import { formatDuration } from "@/lib/utils/time-formatter";
import type { SessionAnalytics } from "@/types/session-analytics";
import {
	AlertTriangle,
	BookOpen,
	CheckSquare,
	Clock,
	FileText,
	History,
	RotateCcw,
	Target,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import { transformToDifficultyData } from "./chart-data-adapters";
import {
	CHART_THEMES,
	ChartContainer,
	ChartGrid,
	ChartLayout,
	type ContentType,
} from "./chart-layout";
import { ContentTypeSelectorInline } from "./content-type-selector";
import { PerformanceTimeline } from "./performance-timeline";

interface SessionFeedbackProps {
	analytics: SessionAnalytics;
	onStartNewSession: () => void;
	onReviewGaps: () => void;
}

export function SessionFeedback({
	analytics,
	onStartNewSession,
	onReviewGaps,
}: SessionFeedbackProps) {
	const { session, responses, learningGaps, schedulingData } = analytics;

	// State for content type view (defaults to session's actual type)
	const [selectedContentType, setSelectedContentType] = useState<ContentType>(
		session.contentType as ContentType
	);

	// Get theme colors based on selected content type for visualization
	const chartTheme = CHART_THEMES[selectedContentType];
	const contentTypeColors = getContentTypeColors(selectedContentType);

	// Use content-specific colors with fallback
	const CHART_COLORS = {
		primary: chartTheme.primary,
		secondary: chartTheme.secondary,
		accent: chartTheme.accent,
		success: chartTheme.success,
		error: chartTheme.error,
		warning: chartTheme.warning,
		muted: "#6b7280", // gray-500
	};

	// Content-type specific terminology and icons
	const contentTypeConfig = {
		cuecard: {
			itemLabel: "Cards Completed",
			icon: BookOpen,
			primaryColor: "text-blue-500",
		},
		mcq: {
			itemLabel: "Questions Answered",
			icon: CheckSquare,
			primaryColor: "text-emerald-500",
		},
		open_question: {
			itemLabel: "Questions Completed",
			icon: FileText,
			primaryColor: "text-violet-500",
		},
	};

	const currentConfig = contentTypeConfig[selectedContentType];

	// Filter analytics data based on selected content type
	const filteredAnalytics: SessionAnalytics = {
		session: {
			...session,
			// Recalculate session metrics based on filtered data
			accuracy: 0, // Will be calculated below
			itemsCompleted: 0, // Will be calculated below
			totalTime: 0, // Will be calculated below
			contentType: selectedContentType,
		},
		responses: responses.filter(
			(response) => response.contentType === selectedContentType
		),
		learningGaps: learningGaps.filter(
			(gap) => gap.contentType === selectedContentType
		),
		schedulingData: schedulingData.filter(
			(schedule) => schedule.contentType === selectedContentType
		),
		performanceMetrics: {
			...analytics.performanceMetrics,
			// Will be recalculated below
		},
	};

	// Recalculate session metrics for filtered data
	if (filteredAnalytics.responses.length > 0) {
		const correctResponses = filteredAnalytics.responses.filter(
			(r) => r.feedback === "correct"
		);
		filteredAnalytics.session.accuracy =
			(correctResponses.length / filteredAnalytics.responses.length) * 100;
		filteredAnalytics.session.itemsCompleted =
			filteredAnalytics.responses.length;
		filteredAnalytics.session.totalTime = filteredAnalytics.responses.reduce(
			(sum, r) => sum + r.timeSpent,
			0
		);

		// Recalculate performance metrics
		const avgResponseTime =
			filteredAnalytics.session.totalTime / filteredAnalytics.responses.length;

		// Recalculate difficulty distribution for filtered data
		const difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
		const contentThresholds = getContentTypeThresholds(selectedContentType);

		for (const response of filteredAnalytics.responses) {
			const timeInSeconds = response.timeSpent / 1000;
			if (timeInSeconds <= contentThresholds.responseTime.easy) {
				difficultyDistribution.easy++;
			} else if (timeInSeconds <= contentThresholds.responseTime.medium) {
				difficultyDistribution.medium++;
			} else {
				difficultyDistribution.hard++;
			}
		}

		filteredAnalytics.performanceMetrics = {
			averageResponseTime: avgResponseTime,
			accuracyTrend: filteredAnalytics.session.accuracy,
			difficultyDistribution,
			improvementRate: analytics.performanceMetrics.improvementRate, // Keep original for now
		};
	} else {
		// No data for selected content type
		filteredAnalytics.session.accuracy = 0;
		filteredAnalytics.session.itemsCompleted = 0;
		filteredAnalytics.session.totalTime = 0;
		filteredAnalytics.performanceMetrics = {
			averageResponseTime: 0,
			accuracyTrend: 0,
			difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
			improvementRate: 0,
		};
	}

	// Use chart data adapters for content-type aware difficulty data with filtered analytics
	const difficultyPieData = transformToDifficultyData(
		filteredAnalytics,
		selectedContentType,
		CHART_COLORS
	);

	return (
		<ChartLayout>
			<div className="space-y-6 lg:space-y-8">
				{/* Content Type Selector */}
				<div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 z-10">
					<div className="space-y-2">
						<ContentTypeSelectorInline
							value={selectedContentType}
							onChange={setSelectedContentType}
							className="justify-center"
						/>
						{selectedContentType !== session.contentType && (
							<p className="text-xs text-muted-foreground text-center">
								Viewing {selectedContentType} data only (original session:{" "}
								{session.contentType})
							</p>
						)}
					</div>
				</div>

				{/* Quick Stats - Responsive to selected content type */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<Card style={{ borderColor: `${contentTypeColors.primary}20` }}>
						<CardContent className="flex items-center gap-3 p-4 sm:p-6">
							<Target className={`w-8 h-8 ${currentConfig.primaryColor}`} />
							<div>
								<p className="text-2xl font-bold">
									{Math.round(filteredAnalytics.session.accuracy)}%
								</p>
								<p className="text-sm text-muted-foreground">Accuracy</p>
							</div>
						</CardContent>
					</Card>

					<Card style={{ borderColor: `${contentTypeColors.secondary}40` }}>
						<CardContent className="flex items-center gap-3 p-4 sm:p-6">
							<Clock
								className="w-8 h-8"
								style={{ color: contentTypeColors.secondary }}
							/>
							<div>
								<p className="text-2xl font-bold">
									{formatDuration(filteredAnalytics.session.totalTime)}
								</p>
								<p className="text-sm text-muted-foreground">Total Time</p>
							</div>
						</CardContent>
					</Card>

					<Card style={{ borderColor: `${contentTypeColors.accent}60` }}>
						<CardContent className="flex items-center gap-3 p-4 sm:p-6">
							<currentConfig.icon
								className="w-8 h-8"
								style={{ color: contentTypeColors.primary }}
							/>
							<div>
								<p className="text-2xl font-bold">
									{filteredAnalytics.session.itemsCompleted}
								</p>
								<p className="text-sm text-muted-foreground">
									{currentConfig.itemLabel}
								</p>
							</div>
						</CardContent>
					</Card>

					<Card style={{ borderColor: `${contentTypeColors.warning}40` }}>
						<CardContent className="flex items-center gap-3 p-4 sm:p-6">
							<AlertTriangle
								className="w-8 h-8"
								style={{ color: contentTypeColors.warning }}
							/>
							<div>
								<p className="text-2xl font-bold">
									{filteredAnalytics.learningGaps.length}
								</p>
								<p className="text-sm text-muted-foreground">Learning Gaps</p>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Performance Charts - Using large viewport containers */}
				<ChartGrid columns={1}>
					{/* Performance Timeline - Primary chart with full width */}
					<ChartContainer priority="primary">
						<PerformanceTimeline
							data={filteredAnalytics}
							contentType={selectedContentType}
							colors={CHART_COLORS}
							className="h-full"
						/>
					</ChartContainer>
				</ChartGrid>

				{/* Difficulty Distribution Chart - Full width viewport */}
				{filteredAnalytics.responses.length > 0 && (
					<ChartGrid columns={1}>
						<ChartContainer priority="primary" className="min-h-[500px]">
							<Card className="h-full border-0">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Target
											className="w-5 h-5"
											style={{ color: contentTypeColors.primary }}
										/>
										Difficulty Distribution
									</CardTitle>
									<CardDescription>
										Response time analysis showing easy, medium, and hard{" "}
										{selectedContentType} items
									</CardDescription>
								</CardHeader>
								<CardContent className="h-[calc(100%-5rem)]">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={difficultyPieData}
												cx="50%"
												cy="50%"
												labelLine={false}
												label={({
													name,
													percent,
												}: { name: string; percent: number }) =>
													`${name} ${(percent * 100).toFixed(0)}%`
												}
												outerRadius={180}
												innerRadius={60}
												fill="#8884d8"
												dataKey="value"
												animationBegin={0}
												animationDuration={800}
											>
												{difficultyPieData.map((entry) => (
													<Cell
														key={entry.name}
														fill={entry.color || CHART_COLORS.primary}
														stroke="white"
														strokeWidth={2}
													/>
												))}
											</Pie>
											<Tooltip
												formatter={(value: number) => [
													`${value} items`,
													"Count",
												]}
												labelFormatter={(label) => `${label} Difficulty`}
											/>
											<Legend
												verticalAlign="bottom"
												height={36}
												iconType="circle"
											/>
										</PieChart>
									</ResponsiveContainer>
								</CardContent>
							</Card>
						</ChartContainer>
					</ChartGrid>
				)}

				{/* Learning Gaps Section */}
				{filteredAnalytics.learningGaps.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<AlertTriangle className="w-5 h-5 text-orange-500" />
								Learning Gaps Detected
							</CardTitle>
							<CardDescription>
								Areas that need additional focus based on your{" "}
								{selectedContentType} performance
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{filteredAnalytics.learningGaps.slice(0, 5).map((gap) => (
								<div
									key={gap.contentId}
									className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
								>
									<div className="flex-1">
										<p className="font-medium text-foreground">
											{gap.question}
										</p>
										<div className="flex items-center gap-2 mt-1">
											<Badge
												variant={
													gap.severity >= 7 ? "destructive" : "secondary"
												}
											>
												Severity: {gap.severity}/10
											</Badge>
											<span className="text-sm text-muted-foreground">
												Failed {gap.failureCount} time
												{gap.failureCount !== 1 ? "s" : ""}
											</span>
										</div>
									</div>
									<Progress value={gap.severity * 10} className="w-20" />
								</div>
							))}
							{filteredAnalytics.learningGaps.length > 5 && (
								<p className="text-sm text-muted-foreground text-center">
									... and {filteredAnalytics.learningGaps.length - 5} more gaps
									detected
								</p>
							)}
						</CardContent>
					</Card>
				)}

				{/* No Data Message */}
				{filteredAnalytics.responses.length === 0 && (
					<Card className="text-center py-12">
						<CardContent>
							<currentConfig.icon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
							<h3 className="text-lg font-semibold mb-2">
								No {selectedContentType} data found
							</h3>
							<p className="text-muted-foreground mb-4">
								This session doesn't contain any {selectedContentType}{" "}
								responses.
								{selectedContentType !== session.contentType && (
									<>
										{" "}
										Switch back to "{session.contentType}" to see the actual
										session data.
									</>
								)}
							</p>
						</CardContent>
					</Card>
				)}

				{/* Action Buttons */}
				<div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
					<Button
						onClick={onStartNewSession}
						size="lg"
						className="w-full sm:w-auto sm:min-w-[200px]"
					>
						<RotateCcw className="w-4 h-4 mr-2" />
						Start New Session
					</Button>
					{filteredAnalytics.learningGaps.length > 0 && (
						<Button
							onClick={onReviewGaps}
							variant="outline"
							size="lg"
							className="w-full sm:w-auto sm:min-w-[200px]"
						>
							<AlertTriangle className="w-4 h-4 mr-2" />
							Review Problem Areas
						</Button>
					)}
					<Button
						variant="outline"
						size="lg"
						className="w-full sm:w-auto sm:min-w-[200px]"
						asChild
					>
						<Link href="/dashboard/feedback">
							<History className="w-4 h-4 mr-2" />
							Back to Sessions
						</Link>
					</Button>
				</div>
			</div>
		</ChartLayout>
	);
}
