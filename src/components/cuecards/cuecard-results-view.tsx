"use client";

import { FullscreenButton } from "@/components/fullscreen-button";
import { Button } from "@/components/ui/button";
import { SparklesIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface CuecardResultsData {
	totalCards: number;
	correct: number;
	incorrect: number;
	sessionTime: string;
	avgPerCard: string;
}

interface CuecardResultsViewProps {
	sessionId?: string; // Fetch results from database if provided
	results?: CuecardResultsData; // Fallback data if sessionId not available
	onNewSession: () => void;
	onClose: () => void; // Handle navigation to feedback page
}

export function CuecardResultsView({
	sessionId,
	results: fallbackResults,
	onNewSession,
	onClose,
}: CuecardResultsViewProps) {
	const [results, setResults] = useState<CuecardResultsData | null>(null);
	const [isLoading, setIsLoading] = useState(!!sessionId);

	// Fetch results from database if sessionId is provided
	useEffect(() => {
		if (!sessionId) {
			setResults(fallbackResults || null);
			setIsLoading(false);
			return;
		}

		const fetchSessionResults = async () => {
			try {
				setIsLoading(true);
				const { getSessionResults } = await import(
					"@/lib/actions/adaptive-learning"
				);
				const sessionData = await getSessionResults(sessionId);

				if (!sessionData) {
					throw new Error("Failed to fetch session results");
				}

				// Transform database results to match CuecardResultsData format
				const transformedResults: CuecardResultsData = {
					totalCards: sessionData.itemsCompleted,
					correct: sessionData.correctResponses,
					incorrect: sessionData.incorrectResponses,
					sessionTime: formatTime(sessionData.totalTime),
					avgPerCard: `${Math.round(sessionData.averageResponseTime / 1000)} sec`,
				};

				setResults(transformedResults);
			} catch (err) {
				console.error("Failed to fetch cuecard session results:", err);
				toast.error("Failed to load session results");

				// Show user error
				toast.error(
					"Failed to load session results. Using cached data if available."
				);

				// Fall back to cached results if available
				setResults(fallbackResults || null);
			} finally {
				setIsLoading(false);
			}
		};

		fetchSessionResults();
	}, [sessionId, fallbackResults]);

	// Helper function to format time from milliseconds
	const formatTime = (timeMs: number): string => {
		const minutes = Math.floor(timeMs / 60000);
		return minutes < 1 ? "< 1 min" : `${minutes} min`;
	};

	// Get theme-aware colors from CSS variables
	const getChartColors = () => {
		if (typeof window === "undefined") {
			// SSR fallback colors
			return ["#22c55e", "#ef4444"];
		}

		const style = getComputedStyle(document.documentElement);
		return [
			style.getPropertyValue("--color-chart-1") ||
				style.getPropertyValue("--color-primary") ||
				"#22c55e",
			style.getPropertyValue("--color-chart-2") ||
				style.getPropertyValue("--color-destructive") ||
				"#ef4444",
		];
	};

	// Show loading state
	if (isLoading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
					<p className="text-muted-foreground">Loading session results...</p>
				</div>
			</div>
		);
	}

	// No results available
	if (!results) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<SparklesIcon className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
					<h3 className="text-lg font-semibold mb-2">No Results Available</h3>
					<p className="text-muted-foreground mb-4">
						Unable to display session results.
					</p>
					<div className="space-x-2">
						<Button onClick={onNewSession}>Start New Session</Button>
						<Button variant="outline" onClick={onClose}>
							Continue
						</Button>
					</div>
				</div>
			</div>
		);
	}

	// Prepare chart data with theme-aware colors
	const chartColors = getChartColors();
	const chartData = [
		{ name: "Correct", value: results.correct, color: chartColors[0] },
		{
			name: "Incorrect",
			value: results.incorrect,
			color: chartColors[1],
		},
	].filter((item) => item.value > 0);

	const totalResponses = results.correct + results.incorrect;

	return (
		<div className="min-h-screen bg-background relative">
			<div className="absolute top-4 right-4 z-10 flex gap-2">
				<FullscreenButton />
				<Button
					variant="ghost"
					size="icon"
					className="bg-background/80 hover:bg-background/90 dark:bg-background/80 dark:hover:bg-background/90 rounded-full border shadow-sm h-10 w-10"
					onClick={onClose}
				>
					<X className="h-6 w-6 text-foreground" />
				</Button>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="max-w-6xl mx-auto">
					{/* Main Results Section */}
					<div className="bg-card rounded-2xl p-8 border mb-8 mt-12">
						<div className="flex flex-col lg:flex-row items-center justify-center gap-8">
							{/* Chart Section */}
							<div className="flex flex-col items-center">
								<div className="w-80 h-80 relative">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={chartData}
												cx="50%"
												cy="50%"
												innerRadius={100}
												outerRadius={140}
												startAngle={90}
												endAngle={450}
												paddingAngle={2}
												dataKey="value"
												stroke="none"
											>
												{chartData.map((entry) => (
													<Cell key={`cell-${entry.name}`} fill={entry.color} />
												))}
											</Pie>
										</PieChart>
									</ResponsiveContainer>
									<div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
										<span className="text-6xl font-bold text-foreground">
											{totalResponses}
										</span>
										<span className="text-muted-foreground text-sm font-medium tracking-wider">
											CUECARDS
										</span>
									</div>
								</div>
							</div>

							{/* Statistics Breakdown */}
							<div className="space-y-6">
								<div className="flex items-center gap-4">
									<div className="w-4 h-4 rounded-full bg-green-500 dark:bg-green-400" />
									<div className="flex flex-col">
										<span className="text-2xl font-bold text-foreground">
											{results.correct}
										</span>
										<span className="text-sm text-muted-foreground">
											✓ I knew this
										</span>
									</div>
								</div>

								<div className="flex items-center gap-4">
									<div className="w-4 h-4 rounded-full bg-red-500 dark:bg-red-400" />
									<div className="flex flex-col">
										<span className="text-2xl font-bold text-foreground">
											{results.incorrect}
										</span>
										<span className="text-sm text-muted-foreground">
											✗ I didn't know this
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Session Statistics */}
					<div className="bg-card rounded-2xl p-8 border">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
							<div className="space-y-2">
								<p className="text-2xl font-bold text-foreground">
									{results.sessionTime}
								</p>
								<p className="text-xs text-muted-foreground uppercase tracking-wider">
									Total Session Time
								</p>
							</div>

							<div className="space-y-2">
								<p className="text-2xl font-bold text-foreground">
									{results.avgPerCard}
								</p>
								<p className="text-xs text-muted-foreground uppercase tracking-wider">
									Average Per Card
								</p>
							</div>

							<div className="space-y-2">
								<p className="text-2xl font-bold text-foreground">
									{results.totalCards}
								</p>
								<p className="text-xs text-muted-foreground uppercase tracking-wider">
									Total Cards Reviewed
								</p>
							</div>
						</div>
					</div>

					{/* Performance Message */}
					<div className="text-center pt-8 pb-4">
						<p className="text-lg text-muted-foreground">
							Based on your performance, difficult cards will appear more
							frequently in future sessions
						</p>
					</div>

					{/* Action Button */}
					<div className="flex justify-center mt-12">
						<Button
							onClick={onNewSession}
							size="lg"
							className="px-8 py-4 text-lg"
						>
							Start New Session
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
