"use client";

import { LoadingButton } from "@/components/adaptive-loading-button";
import { FullscreenButton } from "@/components/fullscreen-button";
import { Button } from "@/components/ui/button";
import { useMcqItemTimer, useMcqSessionTimer } from "@/hooks/use-store-timer";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useState } from "react";
import type { McqConfig } from "./stores/types";
import { useMcqSession } from "./stores/use-mcq-session";

// Option labels for multiple choice questions
const OPTION_LABELS = ["A", "B", "C", "D"] as const;

// Question-specific component that resets state via key prop
interface QuestionViewProps {
	question: McqQuestion;
	questionIndex: number;
	totalQuestions: number;
	onAnswer: (selectedAnswer: string) => Promise<void>;
	onSkip: () => Promise<void>;
	onNextQuestion: () => void;
	onEndSession: () => Promise<void>;
	isEndingSession?: boolean;
}

function QuestionView({
	question,
	questionIndex,
	totalQuestions,
	onAnswer,
	onSkip,
	onNextQuestion,
	onEndSession,
	isEndingSession = false,
}: QuestionViewProps) {
	const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
	const [isSkipped, setIsSkipped] = useState(false);
	const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
	const [isSkippingQuestion, setIsSkippingQuestion] = useState(false);

	const handleSelectAnswer = async (option: string) => {
		if (
			selectedAnswer !== null ||
			isSkipped ||
			isSubmittingAnswer ||
			isSkippingQuestion
		)
			return; // Already answered, skipped, or processing

		setSelectedAnswer(option);
		setIsSubmittingAnswer(true);

		try {
			// Small delay to show loading feedback
			await new Promise((resolve) => setTimeout(resolve, 300));
			await onAnswer(option);
		} finally {
			setIsSubmittingAnswer(false);
		}
	};

	const handleSkip = async () => {
		if (
			selectedAnswer !== null ||
			isSkipped ||
			isSubmittingAnswer ||
			isSkippingQuestion
		)
			return; // Already answered, skipped, or processing

		setIsSkippingQuestion(true);

		try {
			// Small delay to show loading feedback
			await new Promise((resolve) => setTimeout(resolve, 300));
			setIsSkipped(true);
			await onSkip();
		} finally {
			setIsSkippingQuestion(false);
		}
	};

	const handleNextQuestion = async () => {
		if (selectedAnswer === null && !isSkipped) return; // Must select an answer or skip first

		if (questionIndex < totalQuestions - 1) {
			// Move to next question
			onNextQuestion();
		} else {
			// End the session
			await onEndSession();
		}
	};

	return (
		<>
			{/* Question */}
			<div className="text-center mb-12">
				<h1 className="text-3xl font-bold mb-4 leading-tight">
					{question.question}
				</h1>
			</div>

			{/* Options */}
			<div className="space-y-4 mb-12">
				{question.options.map((option, index) => {
					const isSelected = selectedAnswer === option;
					// correctAnswer is stored as index string ("0", "1", "2", "3")
					// Convert to actual option text for comparison
					const correctOption =
						question.options[Number.parseInt(question.correctAnswer)];
					const isCorrect = option === correctOption;
					const showResult = selectedAnswer !== null || isSkipped;

					return (
						<Button
							key={option}
							onClick={() => handleSelectAnswer(option)}
							className={cn(
								"p-6 w-full h-auto text-left transition-all text-lg justify-start min-h-[4rem] items-start",
								selectedAnswer === null &&
									!isSkipped &&
									!isSubmittingAnswer &&
									!isSkippingQuestion
									? "hover:bg-muted/50 hover:border-primary/50"
									: "pointer-events-none",
								// Visual feedback for selected and correct answers
								showResult && isCorrect && "border-green-500 bg-green-500/10",
								showResult &&
									isSelected &&
									!isCorrect &&
									"border-red-500 bg-red-500/10",
								// Visual feedback for skipped questions
								isSkipped && !isCorrect && "border-yellow-500 bg-yellow-500/10"
							)}
							variant="outline"
						>
							<div className="flex items-start space-x-4 w-full">
								<div
									className={cn(
										"w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center font-bold mt-1",
										showResult && isCorrect
											? "border-green-500 text-green-600 bg-green-500/20 dark:text-green-400"
											: showResult && isSelected && !isCorrect
												? "border-red-500 text-red-600 bg-red-500/20 dark:text-red-400"
												: isSkipped && !isSelected
													? "border-yellow-500 text-yellow-600 bg-yellow-500/20 dark:text-yellow-400"
													: "border-primary text-primary"
									)}
								>
									{OPTION_LABELS[index]}
								</div>
								<span
									className={cn(
										"flex-1 text-left break-words whitespace-normal leading-relaxed",
										showResult &&
											isCorrect &&
											"text-green-600 dark:text-green-400",
										showResult &&
											isSelected &&
											!isCorrect &&
											"text-red-600 dark:text-red-400",
										isSkipped &&
											!isSelected &&
											"text-yellow-600 dark:text-yellow-400"
									)}
								>
									{option}
								</span>
							</div>
						</Button>
					);
				})}
			</div>

			{/* Action Buttons */}
			<div className="flex flex-col gap-4 w-full max-w-md mx-auto">
				{/* Skip Button - only shown when no answer selected and not already skipped */}
				{selectedAnswer === null && !isSkipped && (
					<LoadingButton
						onClick={handleSkip}
						isLoading={isSkippingQuestion}
						loadingText="Skipping..."
						disabled={isSubmittingAnswer || isSkippingQuestion}
						variant="ghost"
						size="lg"
						className="w-full px-8 py-4 text-lg font-semibold border border-dashed border-muted-foreground/40 hover:border-muted-foreground/60"
					>
						Skip Question
					</LoadingButton>
				)}

				{/* Next/Finish Button */}
				<LoadingButton
					onClick={handleNextQuestion}
					disabled={
						(selectedAnswer === null && !isSkipped) ||
						isSubmittingAnswer ||
						isSkippingQuestion
					}
					isLoading={
						(isEndingSession && questionIndex >= totalQuestions - 1) ||
						isSubmittingAnswer
					}
					loadingText={
						isSubmittingAnswer ? "Submitting..." : "Ending session..."
					}
					size="lg"
					className="w-full px-8 py-4 text-lg font-semibold"
					variant={selectedAnswer !== null || isSkipped ? "default" : "outline"}
				>
					{isSubmittingAnswer
						? "Submitting..."
						: selectedAnswer !== null || isSkipped
							? questionIndex < totalQuestions - 1
								? "Next Question"
								: "Finish Session"
							: "Select an Answer"}
				</LoadingButton>
			</div>
		</>
	);
}

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
		timeSpent?: number // Made optional - timer will provide it
	) => Promise<void>;
	onSkipQuestion: (
		questionId: string,
		timeSpent?: number // Made optional - timer will provide it
	) => Promise<void>;
	onEndSession: () => Promise<void>;
	onClose: () => void;
};

export function McqQuizView({
	questions,
	config: _, // Reserved for future configuration features
	onQuestionAnswer,
	onSkipQuestion,
	onEndSession,
	onClose,
}: McqQuizViewProps) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [isEndingSession, setIsEndingSession] = useState(false);

	// Use store-based timers instead of manual calculations
	const sessionTimer = useMcqSessionTimer();
	const itemTimer = useMcqItemTimer();

	// Show message if no questions available
	if (questions.length === 0) {
		return (
			<div className="relative flex h-full flex-1 flex-col">
				<div className="flex-1 overflow-y-auto">
					<div className="min-h-screen bg-background flex items-center justify-center relative">
						<div className="absolute top-4 right-4 z-10">
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
						<div className="text-center max-w-md mx-auto px-4">
							<h2 className="text-2xl font-bold mb-4">
								No Questions Available
							</h2>
							<p className="text-muted-foreground text-lg mb-8">
								MCQ questions need to be loaded from the database.
							</p>
							<Button
								onClick={onClose}
								size="lg"
								className="w-full sm:w-auto sm:min-w-40 px-6 sm:px-8 py-4 text-lg font-semibold"
							>
								Close
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	const currentQuestion = questions[currentQuestionIndex];

	const handleAnswer = async (selectedAnswer: string) => {
		// Call the parent component's callback to handle the answer
		// Timer will be handled by the store via finishItem()
		await onQuestionAnswer(currentQuestion.id, selectedAnswer);
	};

	const handleSkip = async () => {
		// Call the parent component's callback to handle the skip
		// Timer will be handled by the store via finishItem()
		await onSkipQuestion(currentQuestion.id);
	};

	// Get MCQ session actions for timer control
	const startItem = useMcqSession((state) => state.actions.startItem);

	const handleNextQuestion = () => {
		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1);
			// Start timer for the new question
			startItem();
		}
	};

	const handleEndSession = async () => {
		setIsEndingSession(true);
		try {
			// End the session - the store's timer will provide session time
			await onEndSession();
		} finally {
			setIsEndingSession(false);
		}
	};

	return (
		<div className="relative flex h-full flex-1 flex-col">
			<div className="flex-1 overflow-y-auto">
				<div className="min-h-screen bg-background relative">
					<div className="absolute top-4 right-4 z-10 flex gap-2">
						<FullscreenButton />
						<Button
							variant="ghost"
							size="icon"
							onClick={onClose}
							disabled={isEndingSession}
							className="bg-background/80 hover:bg-background/90 dark:bg-background/80 dark:hover:bg-background/90 rounded-full border shadow-sm h-10 w-10"
						>
							<X className="h-6 w-6 text-foreground" />
						</Button>
					</div>

					<div className="container mx-auto px-4 py-8">
						<div className="max-w-4xl mx-auto">
							{/* Timer and Progress */}
							<div className="flex justify-between items-center mb-8">
								<div className="text-center">
									<div className="text-sm text-muted-foreground mb-1">
										Question Time
									</div>
									<span className="font-mono text-lg bg-muted/50 px-3 py-1 rounded-lg">
										{itemTimer.formattedItemTime}
									</span>
								</div>

								<div className="text-center">
									<div className="text-sm text-muted-foreground mb-1">
										Progress
									</div>
									<div className="font-semibold">
										{currentQuestionIndex + 1} of {questions.length}
									</div>
								</div>

								<div className="text-center">
									<div className="text-sm text-muted-foreground mb-1">
										Session Time
									</div>
									<span className="font-mono text-lg bg-muted/50 px-3 py-1 rounded-lg">
										{sessionTimer.shortFormattedSessionTime}
									</span>
								</div>
							</div>

							{/* Question View with key prop for state reset */}
							<QuestionView
								key={currentQuestion.id} // This resets component state when question changes
								question={currentQuestion}
								questionIndex={currentQuestionIndex}
								totalQuestions={questions.length}
								onAnswer={handleAnswer}
								onSkip={handleSkip}
								onNextQuestion={handleNextQuestion}
								onEndSession={handleEndSession}
								isEndingSession={isEndingSession}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
