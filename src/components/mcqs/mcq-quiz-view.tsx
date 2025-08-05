"use client";

import { FullscreenButton } from "@/components/fullscreen-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatHhMmSs } from "@/lib/utils/time-formatter";
import type { McqConfig } from "@/stores/mcq-session/types";
import { XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
	config: _, // Reserved for future configuration features
	onQuestionAnswer,
	onEndSession,
	onClose,
}: McqQuizViewProps) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
	const [questionStartTime, setQuestionStartTime] = useState<number>(
		Date.now()
	);
	const [totalTime, setTotalTime] = useState(0);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const sessionStartTimeRef = useRef<number>(Date.now());

	// Timer effect for tracking session time
	useEffect(() => {
		intervalRef.current = setInterval(() => {
			setTotalTime(Date.now() - sessionStartTimeRef.current);
		}, 1000);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	// Reset selected answer when question changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: We need this to run when question changes
	useEffect(() => {
		setSelectedAnswer(null);
		setQuestionStartTime(Date.now());
	}, [currentQuestionIndex]);

	// Show message if no questions available
	if (questions.length === 0) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center relative">
				<div className="absolute top-4 right-4 z-10">
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						className="bg-gray-100 hover:bg-gray-200 rounded-full"
					>
						<XIcon className="h-6 w-6 text-gray-600" />
					</Button>
				</div>
				<div className="text-center max-w-md mx-auto px-4">
					<h2 className="text-2xl font-bold mb-4">No Questions Available</h2>
					<p className="text-muted-foreground text-lg mb-8">
						MCQ questions need to be loaded from the database.
					</p>
					<Button onClick={onClose} size="lg">
						Close
					</Button>
				</div>
			</div>
		);
	}

	const currentQuestion = questions[currentQuestionIndex];

	const handleSelectAnswer = (option: string) => {
		if (selectedAnswer !== null) return; // Already answered

		const timeSpent = Date.now() - questionStartTime;
		setSelectedAnswer(option);

		// Call the parent component's callback to handle the answer
		onQuestionAnswer(currentQuestion.id, option, timeSpent);
	};

	const handleNextQuestion = () => {
		if (selectedAnswer === null) return; // Must select an answer first

		if (currentQuestionIndex < questions.length - 1) {
			// Move to next question
			setCurrentQuestionIndex(currentQuestionIndex + 1);
		} else {
			// End the session
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
			onEndSession(totalTime);
		}
	};

	return (
		<div className="min-h-screen bg-background relative">
			<div className="absolute top-4 right-4 z-10 flex gap-2">
				<FullscreenButton />
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					className="bg-gray-100 hover:bg-gray-200 rounded-full"
				>
					<XIcon className="h-6 w-6 text-gray-600" />
				</Button>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					{/* Timer and Progress */}
					<div className="flex justify-between items-center mb-8">
						<span className="font-mono text-xl bg-muted px-4 py-2 rounded-lg">
							{formatHhMmSs(Math.floor(totalTime / 1000))}
						</span>
						<div className="text-center">
							<div className="text-sm text-muted-foreground mb-1">Progress</div>
							<div className="font-semibold">
								{currentQuestionIndex + 1} of {questions.length}
							</div>
						</div>
					</div>

					{/* Question */}
					<div className="text-center mb-12">
						<h1 className="text-3xl font-bold mb-4 leading-tight">
							{currentQuestion.question}
						</h1>
					</div>

					{/* Options */}
					<div className="space-y-4 mb-12">
						{currentQuestion.options.map((option, index) => {
							const isSelected = selectedAnswer === option;
							const isCorrect = option === currentQuestion.correctAnswer;
							const showResult = selectedAnswer !== null;

							return (
								<button
									type="button"
									key={option}
									onClick={() => handleSelectAnswer(option)}
									disabled={selectedAnswer !== null}
									className={cn(
										"p-6 flex items-center w-full space-x-4 rounded-xl border-2 text-left transition-all text-lg",
										selectedAnswer !== null
											? "cursor-not-allowed"
											: "cursor-pointer hover:bg-muted/50 hover:border-primary/50",
										// Visual feedback for selected and correct answers
										showResult && isCorrect && "border-green-500 bg-green-50",
										showResult &&
											isSelected &&
											!isCorrect &&
											"border-red-500 bg-red-50",
										showResult && !isSelected && !isCorrect && "opacity-60"
									)}
								>
									<div
										className={cn(
											"w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center font-bold",
											showResult && isCorrect
												? "border-green-500 text-green-700 bg-green-100"
												: showResult && isSelected && !isCorrect
													? "border-red-500 text-red-700 bg-red-100"
													: "border-primary text-primary"
										)}
									>
										{String.fromCharCode(65 + index)}
									</div>
									<span
										className={cn(
											"flex-1",
											showResult && isCorrect && "text-green-800",
											showResult && isSelected && !isCorrect && "text-red-800"
										)}
									>
										{option}
									</span>
								</button>
							);
						})}
					</div>

					{/* Action Button */}
					<div className="flex justify-center">
						<Button
							onClick={handleNextQuestion}
							disabled={selectedAnswer === null}
							size="lg"
							className="px-8 py-4 text-lg"
						>
							{selectedAnswer !== null
								? currentQuestionIndex < questions.length - 1
									? "Next Question"
									: "Finish Session"
								: "Select an Answer"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
