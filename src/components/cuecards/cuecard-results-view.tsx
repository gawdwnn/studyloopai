"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import confetti from "canvas-confetti";
import { X } from "lucide-react";
import { useEffect } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface CuecardResultsData {
	totalCards: number;
	correct: number;
	incorrect: number;
	sessionTime: string;
	avgPerCard: string;
	weekInfo: string;
}

interface CuecardResultsViewProps {
	results: CuecardResultsData;
	onNewSession: () => void;
}

export function CuecardResultsView({
	results,
	onNewSession,
}: CuecardResultsViewProps) {
	useEffect(() => {
		// Trigger confetti animation when component mounts
		const timer = setTimeout(() => {
			confetti({
				particleCount: 500,
				spread: 200,
				origin: { y: 0.6 },
				colors: ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"],
			});
		}, 500);

		return () => clearTimeout(timer);
	}, []);

	// Prepare chart data with consistent colors
	const chartData = [
		{ name: "Correct", value: results.correct, color: "#10b981" }, // green-500
		{ name: "Incorrect", value: results.incorrect, color: "#ef4444" }, // red-500
	].filter((item) => item.value > 0);

	const totalResponses = results.correct + results.incorrect;

	return (
		<div className="bg-background flex justify-center mt-10">
			<Card className="w-full max-w-5xl relative">
				<Button
					variant="ghost"
					size="icon"
					className="absolute top-4 right-4 z-10 bg-muted hover:bg-muted/80 rounded-full"
					onClick={onNewSession}
				>
					<X className="h-6 w-6 text-muted-foreground" />
				</Button>

				<CardHeader className="text-center pb-2">
					<div className="flex justify-between items-center mb-4 pr-12">
						<div className="text-sm text-muted-foreground">
							{results.weekInfo}
						</div>
						<Button
							onClick={onNewSession}
							className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg"
						>
							New Session
						</Button>
					</div>
				</CardHeader>

				<CardContent className="space-y-8">
					<div className="text-center">
						<CardTitle className="text-2xl font-semibold mb-2">
							Well, that was short and sweet... 🙌
						</CardTitle>
					</div>

					{/* Main Results Section */}
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
										FLASHCARDS
									</span>
								</div>
							</div>
						</div>

						{/* Statistics Breakdown */}
						<div className="space-y-6">
							<div className="flex items-center gap-4">
								<div
									className="w-4 h-4 rounded-full"
									style={{ backgroundColor: "#10b981" }}
								/>
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
								<div
									className="w-4 h-4 rounded-full"
									style={{ backgroundColor: "#ef4444" }}
								/>
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

					{/* Session Statistics */}
					<div className="border-t pt-6">
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
					<div className="text-center pt-4">
						<p className="text-sm text-muted-foreground">
							Based on your performance, difficult cards will appear more
							frequently in future sessions
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
