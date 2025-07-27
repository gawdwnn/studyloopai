"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { generateAnswerFeedback } from "@/lib/ai/answer-feedback-service";
import confetti from "canvas-confetti";
import { SparklesIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
	AnswerFeedbackAnalysis,
	type AnswerFeedbackData,
} from "./answer-feedback-analysis";

interface OpenQuestionResultsData {
	answered: number;
	skipped: number;
	totalTime: string;
	timeOnExercise: string;
	avgPerExercise: string;
	questions: Array<{
		question: string;
		time: string;
		userAnswer: string | null;
		sampleAnswer: string;
	}>;
	practiceMode: "practice" | "exam";
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

type OpenQuestionResultsViewProps = {
	results: OpenQuestionResultsData;
	onRestart: () => void;
};

export function OpenQuestionResultsView({
	results,
	onRestart,
}: OpenQuestionResultsViewProps) {
	const [openItems, setOpenItems] = useState<string[]>([]);

	// Dummy feedback data for static UI
	const getDummyFeedback = (): AnswerFeedbackData => ({
		factualCorrectness: {
			score: 85,
			feedback:
				"Your answer demonstrates strong factual accuracy with correct concepts and terminology.",
			strengths: [
				"Accurate use of technical terms",
				"Correct identification of key concepts",
			],
			improvements: [
				"Could include more specific examples",
				"Consider citing relevant sources",
			],
		},
		logicalStructure: {
			score: 78,
			feedback:
				"The logical flow is generally clear, though some transitions could be smoother.",
			strengths: [
				"Clear introduction and conclusion",
				"Good paragraph organization",
			],
			improvements: [
				"Improve transitions between ideas",
				"Consider using more structured argumentation",
			],
		},
		depthOfInsight: {
			score: 72,
			feedback:
				"Shows good understanding but could benefit from deeper analysis of implications.",
			strengths: [
				"Demonstrates understanding of core concepts",
				"Makes relevant connections",
			],
			improvements: [
				"Explore underlying causes and effects",
				"Consider multiple perspectives",
			],
		},
		supportingEvidence: {
			score: 68,
			feedback:
				"Limited use of supporting evidence and examples to strengthen arguments.",
			strengths: ["Uses some relevant examples", "References course material"],
			improvements: [
				"Include more specific evidence",
				"Use data or statistics where appropriate",
			],
		},
		overallScore: 76,
		overallFeedback:
			"Your answer shows solid understanding with room for improvement in depth and evidence. Focus on providing more specific examples and exploring implications more thoroughly.",
	});

	useEffect(() => {
		// Trigger confetti animation when component mounts
		const timer = setTimeout(() => {
			confetti({
				particleCount: 100,
				spread: 70,
				origin: { y: 0.6 },
				colors: [
					"hsl(var(--chart-1))",
					"hsl(var(--chart-2))",
					"hsl(var(--chart-3))",
					"hsl(var(--chart-4))",
					"hsl(var(--chart-5))",
				],
			});
		}, 500);

		return () => clearTimeout(timer);
	}, []);

	const totalQuestions = results.answered + results.skipped;
	const completionRate =
		totalQuestions > 0
			? Math.round((results.answered / totalQuestions) * 100)
			: 0;

	// Create chart data from results
	const chartData = [
		{ name: "Answered", value: completionRate },
		{ name: "Skipped", value: 100 - completionRate },
	];

	const handleShowAll = () => {
		setOpenItems(results.questions.map((_, index) => `item-${index}`));
	};

	const handleHideAll = () => {
		setOpenItems([]);
	};

	return (
		<div className="flex justify-center mt-10">
			<Card className="w-full max-w-5xl relative">
				<Button
					variant="ghost"
					size="icon"
					className="absolute top-4 right-4 z-10 bg-muted hover:bg-muted/80 rounded-full"
					onClick={onRestart}
				>
					<XIcon className="h-6 w-6 text-muted-foreground" />
				</Button>
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-semibold">
						Great work! Keep practicing with open-ended questions! 👋
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid md:grid-cols-3 gap-8 items-center py-8">
						<div className="text-center md:text-left">
							<p className="text-xl font-bold">
								You answered {results.answered} questions
							</p>
							<p className="text-sm text-muted-foreground mt-1">
								{results.skipped > 0 &&
									`You skipped ${results.skipped} questions`}
							</p>
						</div>

						<div className="flex flex-col items-center relative">
							<div className="w-56 h-56 relative">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={chartData}
											cx="50%"
											cy="50%"
											innerRadius={80}
											outerRadius={100}
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
									<span className="text-4xl font-bold">{completionRate}%</span>
									<span className="text-muted-foreground text-sm">
										COMPLETION RATE
									</span>
								</div>
							</div>
						</div>
						<div className="space-y-4 text-center md:text-left">
							<div className="flex flex-col items-center md:items-start">
								<p className="text-2xl font-bold">{results.totalTime}</p>
								<p className="text-xs text-muted-foreground">TOTAL TIME</p>
							</div>
							<div className="flex flex-col items-center md:items-start">
								<p className="text-2xl font-bold">{results.timeOnExercise}</p>
								<p className="text-xs text-muted-foreground">
									TIME ON EXERCISE
								</p>
							</div>
							<div className="flex flex-col items-center md:items-start">
								<p className="text-2xl font-bold">{results.avgPerExercise}</p>
								<p className="text-xs text-muted-foreground">
									AVERAGE PER EXERCISE
								</p>
							</div>
						</div>
					</div>

					<div className="mt-8 border-t pt-6">
						<div className="flex justify-end space-x-2 mb-4">
							<Button variant="link" size="sm" onClick={handleShowAll}>
								Show all
							</Button>
							<Button variant="link" size="sm" onClick={handleHideAll}>
								Hide all
							</Button>
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
								>
									<AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
										<div className="flex justify-between w-full items-center gap-4">
											<div className="flex-1 text-left">{q.question}</div>
											<div className="flex items-center space-x-4 flex-shrink-0">
												<span className="text-sm text-muted-foreground">
													{q.time}
												</span>
												<span className="text-sm text-muted-foreground">
													{q.userAnswer ? "Answered" : "Skipped"}
												</span>
												<span className="text-sm text-muted-foreground">
													({index + 1}/{results.questions.length})
												</span>
											</div>
										</div>
									</AccordionTrigger>
									<AccordionContent className="px-4 pt-4 pb-2">
										<div className="space-y-4">
											{/* Your Answer */}
											{q.userAnswer && (
												<div className="p-3 bg-muted/30 rounded-md">
													<h4 className="font-medium text-sm mb-2">
														Your Answer:
													</h4>
													<p className="text-sm">{q.userAnswer}</p>
												</div>
											)}

											{/* Sample Answer */}
											<div className="p-3 bg-accent/50 rounded-md">
												<h4 className="font-medium text-sm mb-2">
													Sample Answer:
												</h4>
												<p className="text-sm text-muted-foreground">
													{q.sampleAnswer}
												</p>
											</div>

											{/* Feedback - Always show for answered questions */}
											{q.userAnswer && (
												<div className="space-y-4">
													<h4 className="font-medium">Feedback</h4>
													<AnswerFeedbackAnalysis
														feedback={getDummyFeedback()}
													/>
												</div>
											)}
										</div>

										<div className="mt-4 flex justify-center">
											<Button variant="ghost" className="text-primary">
												<SparklesIcon className="mr-2 h-4 w-4" />
												Chat Feedback
											</Button>
										</div>
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
