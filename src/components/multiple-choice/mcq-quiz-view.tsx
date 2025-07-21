"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { McqConfig } from "@/stores/mcq-session/types";
import { CheckCircle2, XCircle, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface McqQuestion {
	id: string;
	question: string;
	options: string[];
	correctAnswer: string;
	explanation?: string;
	difficulty: "easy" | "medium" | "hard";
	source: string;
	week: string;
}

type McqQuizViewProps = {
	questions: McqQuestion[];
	config: McqConfig;
	onQuestionAnswer: (
		questionId: string,
		selectedAnswer: string | null,
		timeSpent: number
	) => void;
	onEndSession: (totalTime: number) => void;
	onClose: () => void;
};

export function McqQuizView({
	questions,
	config,
	onQuestionAnswer,
	onEndSession,
	onClose,
}: McqQuizViewProps) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
	const [isAnswered, setIsAnswered] = useState(false);
	const [time, setTime] = useState(0);
	const [questionStartTime, setQuestionStartTime] = useState(Date.now());

	useEffect(() => {
		const timer = setInterval(() => {
			setTime((prevTime) => prevTime + 1);
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	const formatTime = (seconds: number) => {
		const m = Math.floor(seconds / 60)
			.toString()
			.padStart(2, "0");
		const s = (seconds % 60).toString().padStart(2, "0");
		return `00:${m}:${s}`;
	};

	const currentQuestion = questions[currentQuestionIndex];

	// Reset question start time when moving to next question
	useEffect(() => {
		setQuestionStartTime(Date.now());
	}, []);

	const handleSelectAnswer = (answer: string) => {
		if (isAnswered) return;
		setSelectedAnswer(answer);
		setIsAnswered(true);

		// Record answer immediately in practice mode
		if (config.practiceMode === "practice") {
			const timeSpent = Date.now() - questionStartTime;
			onQuestionAnswer(currentQuestion.id, answer, timeSpent);
		}
	};

	const handleNextQuestion = () => {
		// Record answer for exam mode or if not already recorded
		if (config.practiceMode === "exam" || !selectedAnswer) {
			const timeSpent = Date.now() - questionStartTime;
			onQuestionAnswer(currentQuestion.id, selectedAnswer, timeSpent);
		}

		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1);
			setSelectedAnswer(null);
			setIsAnswered(false);
		} else {
			onEndSession(time * 1000); // Convert to milliseconds
		}
	};

	const getOptionState = (option: string) => {
		// In exam mode, don't show correct/incorrect until end
		if (config.practiceMode === "exam" && !isAnswered) {
			return "default";
		}

		if (!isAnswered) {
			return "default";
		}
		if (option === currentQuestion.correctAnswer) {
			return "correct";
		}
		if (option === selectedAnswer && option !== currentQuestion.correctAnswer) {
			return "incorrect";
		}
		return "default";
	};

	return (
		<div className="flex justify-center mt-10">
			<Card className="w-full max-w-4xl">
				<CardContent className="p-8 relative">
					<div className="px-16">
						<Progress
							value={((currentQuestionIndex + 1) / questions.length) * 100}
							className="mb-4 h-1.5"
						/>
					</div>
					<div className="flex justify-between items-center mb-4">
						<Button variant="ghost">Pause</Button>
						<span className="font-mono text-lg">{formatTime(time)}</span>
						<Button
							variant="ghost"
							size="icon"
							onClick={onClose}
							className="absolute top-4 right-4 z-10 bg-gray-100 hover:bg-gray-200 rounded-full"
						>
							<XIcon className="h-6 w-6 text-gray-600" />
						</Button>
					</div>

					<div className="text-center text-sm text-muted-foreground mb-8">
						{currentQuestionIndex + 1} / {questions.length}
					</div>

					<div className="text-center mb-8">
						<h2 className="text-2xl font-semibold">
							{currentQuestion.question}
						</h2>
					</div>

					<div className="space-y-4">
						{currentQuestion.options.map((option) => {
							const state = getOptionState(option);
							return (
								<button
									type="button"
									key={option}
									onClick={() => handleSelectAnswer(option)}
									disabled={isAnswered}
									aria-pressed={selectedAnswer === option}
									className={cn(
										"p-4 flex items-center w-full space-x-4 rounded-lg border text-left transition-all",
										isAnswered
											? "cursor-not-allowed"
											: "cursor-pointer hover:bg-muted/50",
										state === "correct" && "border-green-500",
										state === "incorrect" && "border-red-500"
									)}
								>
									<div
										className={cn(
											"w-6 h-6 rounded-full border border-primary flex-shrink-0 flex items-center justify-center",
											state !== "default" && "border-transparent"
										)}
									>
										{state === "correct" && (
											<CheckCircle2 className="text-green-500 w-full h-full" />
										)}
										{state === "incorrect" && (
											<XCircle className="text-red-500 w-full h-full" />
										)}
									</div>
									<span>{option}</span>
								</button>
							);
						})}
					</div>

					<div className="flex justify-center space-x-4 mt-8">
						{config.practiceMode === "practice" &&
							currentQuestion.explanation && (
								<Button variant="outline" disabled={!isAnswered}>
									Get explanation
								</Button>
							)}
						<Button onClick={handleNextQuestion} disabled={!isAnswered}>
							{isAnswered
								? currentQuestionIndex < questions.length - 1
									? "Next question"
									: "Finish Session"
								: "Next"}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
