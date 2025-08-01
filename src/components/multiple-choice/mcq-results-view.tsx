"use client";

import { FullscreenButton } from "@/components/fullscreen-button";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { CheckCircle2, SparklesIcon, XCircle, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface McqResultsData {
	score: number;
	skipped: number;
	totalTime: string;
	timeOnExercise: string;
	avgPerExercise: string;
	questions: Array<{
		question: string;
		time: string;
		correct: boolean;
		userAnswer: string | null;
		correctAnswer: string;
		options: string[];
		explanation?: string;
	}>;
}

const COLORS = ["#3b82f6", "#e5e7eb"]; // blue-500, gray-200

type McqResultsViewProps = {
	results: McqResultsData;
	onRestart: () => void;
};

export function McqResultsView({ results, onRestart }: McqResultsViewProps) {
	const [openItems, setOpenItems] = useState<string[]>([]);

	useEffect(() => {
		// Trigger confetti animation when component mounts
		const timer = setTimeout(() => {
			confetti({
				particleCount: 100,
				spread: 70,
				origin: { y: 0.6 },
				colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
			});
		}, 500);

		return () => clearTimeout(timer);
	}, []);

	// Create chart data from results
	const chartData = [
		{ name: "Correct", value: results.score },
		{ name: "Incorrect", value: 100 - results.score },
	];

	const handleShowAll = () => {
		setOpenItems(results.questions.map((_, index) => `item-${index}`));
	};

	const handleHideAll = () => {
		setOpenItems([]);
	};

	const getOptionState = (
		option: string,
		correctAnswer: string,
		userAnswer: string | null
	) => {
		if (option === correctAnswer) {
			return "correct";
		}
		if (option === userAnswer && option !== correctAnswer) {
			return "incorrect";
		}
		return "default";
	};

	return (
		<div className="min-h-screen bg-background relative">
			<div className="absolute top-4 right-4 z-10 flex gap-2">
				<FullscreenButton />
				<Button
					variant="ghost"
					size="icon"
					className="bg-gray-100 hover:bg-gray-200 rounded-full"
					onClick={onRestart}
				>
					<XIcon className="h-6 w-6 text-gray-600" />
				</Button>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="max-w-6xl mx-auto">
					{/* Header */}
					<div className="text-center mb-12">
						<h1 className="text-4xl font-bold mb-4">Session Complete! 🎉</h1>
						<p className="text-xl text-muted-foreground">
							Great work! Here's how you performed.
						</p>
					</div>
					{/* Performance Overview */}
					<div className="bg-card rounded-2xl p-8 border mb-12">
						<div className="grid md:grid-cols-3 gap-8 items-center">
							<div className="text-center md:text-left">
								<p className="text-2xl font-bold mb-2">
									{results.skipped} Questions Skipped
								</p>
								<p className="text-muted-foreground">
									Don&apos;t worry, they won&apos;t count in the feedback
								</p>
							</div>

							<div className="flex flex-col items-center relative">
								<div className="w-64 h-64 relative">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={chartData}
												cx="50%"
												cy="50%"
												innerRadius={90}
												outerRadius={120}
												startAngle={90}
												endAngle={450}
												paddingAngle={0}
												dataKey="value"
												stroke="none"
											>
												{chartData.map((entry, index) => (
													<Cell
														key={`cell-${entry.name}`}
														fill={COLORS[index % COLORS.length]}
													/>
												))}
											</Pie>
										</PieChart>
									</ResponsiveContainer>
									<div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
										<span className="text-5xl font-bold text-primary">
											{results.score}%
										</span>
										<span className="text-muted-foreground text-sm font-medium">
											ACCURACY
										</span>
									</div>
								</div>
							</div>

							<div className="space-y-6 text-center md:text-left">
								<div className="bg-muted rounded-lg p-4">
									<p className="text-3xl font-bold text-primary">
										{results.totalTime}
									</p>
									<p className="text-sm text-muted-foreground font-medium">
										TOTAL TIME
									</p>
								</div>
								<div className="bg-muted rounded-lg p-4">
									<p className="text-3xl font-bold text-primary">
										{results.timeOnExercise}
									</p>
									<p className="text-sm text-muted-foreground font-medium">
										TIME ON EXERCISE
									</p>
								</div>
								<div className="bg-muted rounded-lg p-4">
									<p className="text-3xl font-bold text-primary">
										{results.avgPerExercise}
									</p>
									<p className="text-sm text-muted-foreground font-medium">
										AVG PER QUESTION
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Question Review */}
					<div className="bg-card rounded-2xl p-8 border">
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-2xl font-bold">Question Review</h2>
							<div className="flex gap-2">
								<Button variant="outline" size="sm" onClick={handleShowAll}>
									Show All
								</Button>
								<Button variant="outline" size="sm" onClick={handleHideAll}>
									Hide All
								</Button>
							</div>
						</div>
						<Accordion
							type="multiple"
							className="w-full"
							value={openItems}
							onValueChange={setOpenItems}
						>
							{results.questions.map((q, index) => (
								<AccordionItem
									value={`item-${index}`}
									key={`${q.question}-${index}`}
									className="border rounded-lg mb-4 last:mb-0"
								>
									<AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
										<div className="flex justify-between w-full items-center gap-4">
											<div className="flex-1 text-left">{q.question}</div>
											<div className="flex items-center space-x-4 flex-shrink-0">
												<span className="text-sm text-muted-foreground">
													{q.time}
												</span>
												{q.correct ? (
													<CheckCircle2 className="text-green-500 h-5 w-5" />
												) : (
													<XCircle className="text-red-500 h-5 w-5" />
												)}
												<span className="text-sm text-muted-foreground">
													({index + 1}/{results.questions.length})
												</span>
											</div>
										</div>
									</AccordionTrigger>
									<AccordionContent className="px-4 pt-4 pb-2">
										<div className="space-y-3">
											{q.options.map((option) => {
												const state = getOptionState(
													option,
													q.correctAnswer,
													q.userAnswer
												);
												return (
													<div
														key={`${q.question}-${option}`}
														className={cn(
															"p-3 flex items-center space-x-3 rounded-md border",
															state === "correct"
																? "border-green-500 bg-green-50/50"
																: "border-border",
															state === "incorrect"
																? "border-red-500 bg-red-50/50"
																: "border-border"
														)}
													>
														<div>
															{state === "correct" && (
																<CheckCircle2 className="text-green-500 h-5 w-5" />
															)}
															{state === "incorrect" && (
																<XCircle className="text-red-500 h-5 w-5" />
															)}
															{state === "default" && (
																<div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
															)}
														</div>
														<span
															className={cn(
																state === "correct" && "text-green-800",
																state === "incorrect" && "text-red-800"
															)}
														>
															{option}
														</span>
													</div>
												);
											})}
										</div>
										{q.explanation && (
											<div className="mt-4 p-3 bg-muted/50 rounded-md">
												<p className="text-sm text-muted-foreground">
													<strong>Explanation:</strong> {q.explanation}
												</p>
											</div>
										)}
										<div className="mt-4 flex justify-center">
											<Button variant="ghost" className="text-primary">
												<SparklesIcon className="mr-2 h-4 w-4" />
												Get explanation
											</Button>
										</div>
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</div>

					{/* Action Buttons */}
					<div className="flex justify-center mt-12">
						<Button onClick={onRestart} size="lg" className="px-8 py-4 text-lg">
							Start New Session
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
