"use client";

import { FullscreenButton } from "@/components/fullscreen-button";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

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

	const pieData = [
		{ name: "Answered", value: results.answered, color: COLORS[0] },
		{ name: "Skipped", value: results.skipped, color: COLORS[1] },
	];

	const handleToggleItem = (value: string) => {
		setOpenItems((prev) =>
			prev.includes(value)
				? prev.filter((item) => item !== value)
				: [...prev, value]
		);
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
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							{/* Stats */}
							<div className="space-y-6">
								<h3 className="text-2xl font-bold">Performance Summary</h3>

								<div className="grid grid-cols-2 gap-4">
									<div className="text-center p-6 bg-muted rounded-lg">
										<div className="text-3xl font-bold text-primary mb-2">
											{results.answered}
										</div>
										<div className="text-sm text-muted-foreground font-medium">
											ANSWERED
										</div>
									</div>
									<div className="text-center p-6 bg-muted rounded-lg">
										<div className="text-3xl font-bold text-orange-500 mb-2">
											{results.skipped}
										</div>
										<div className="text-sm text-muted-foreground font-medium">
											SKIPPED
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div className="bg-muted rounded-lg p-4">
										<p className="text-2xl font-bold text-primary">
											{results.totalTime}
										</p>
										<p className="text-sm text-muted-foreground font-medium">
											TOTAL TIME
										</p>
									</div>
									<div className="bg-muted rounded-lg p-4">
										<p className="text-2xl font-bold text-primary">
											{results.avgPerExercise}
										</p>
										<p className="text-sm text-muted-foreground font-medium">
											AVG PER QUESTION
										</p>
									</div>
								</div>
							</div>

							{/* Chart */}
							<div className="flex flex-col items-center justify-center">
								<h3 className="text-2xl font-bold mb-6">Question Breakdown</h3>
								<div className="w-64 h-64 relative">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={pieData}
												cx="50%"
												cy="50%"
												innerRadius={60}
												outerRadius={100}
												dataKey="value"
												stroke="none"
											>
												{pieData.map((entry) => (
													<Cell key={entry.name} fill={entry.color} />
												))}
											</Pie>
										</PieChart>
									</ResponsiveContainer>
								</div>
								<div className="flex justify-center gap-6 mt-4">
									{pieData.map((entry) => (
										<div key={entry.name} className="flex items-center gap-2">
											<div
												className="w-4 h-4 rounded-full"
												style={{ backgroundColor: entry.color }}
											/>
											<span className="font-medium">{entry.name}</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Question Review */}
					<div className="bg-card rounded-2xl p-8 border">
						<h2 className="text-2xl font-bold mb-6">Question Review</h2>
						<Accordion type="multiple" value={openItems}>
							{results.questions.map((q, index) => (
								<AccordionItem
									key={`q-${index}-${q.question.slice(0, 20)}`}
									value={`question-${index}`}
									className="border rounded-lg mb-4 last:mb-0"
								>
									<AccordionTrigger
										onClick={() => handleToggleItem(`question-${index}`)}
										className="hover:bg-muted/50 px-4 rounded-md"
									>
										<div className="flex items-center justify-between w-full mr-4">
											<span className="font-medium text-left">
												Question {index + 1}
											</span>
											<span className="text-sm text-muted-foreground">
												{q.time}
											</span>
										</div>
									</AccordionTrigger>
									<AccordionContent className="px-4 pt-4 pb-2 space-y-4">
										<div>
											<h4 className="font-medium mb-2">Question:</h4>
											<p className="text-muted-foreground">{q.question}</p>
										</div>

										{q.userAnswer ? (
											<div>
												<h4 className="font-medium mb-2">Your Answer:</h4>
												<div className="p-4 bg-muted rounded-lg">
													<p>{q.userAnswer}</p>
												</div>
											</div>
										) : (
											<div>
												<h4 className="font-medium mb-2">Status:</h4>
												<p className="text-orange-500 font-medium">Skipped</p>
											</div>
										)}

										{results.practiceMode === "practice" && (
											<div>
												<h4 className="font-medium mb-2">Sample Answer:</h4>
												<div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
													<p>{q.sampleAnswer}</p>
												</div>
											</div>
										)}

										{/* TODO: Add AI feedback analysis after database integration */}
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
