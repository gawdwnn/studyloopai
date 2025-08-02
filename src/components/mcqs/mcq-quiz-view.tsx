"use client";

import { FullscreenButton } from "@/components/fullscreen-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatHhMmSs } from "@/lib/utils/time-formatter";
import type { McqConfig } from "@/stores/mcq-session/types";
import { XIcon } from "lucide-react";
import { useState } from "react";

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
	onEndSession,
	onClose,
}: McqQuizViewProps) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [isAnswered, setIsAnswered] = useState(false);
	const [time] = useState(0);

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

	const handleSelectAnswer = () => {
		if (isAnswered) return;
		setIsAnswered(true);
		// TODO: Implement answer handling after database integration
	};

	const handleNextQuestion = () => {
		// TODO: Implement navigation after database integration
		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1);
			setIsAnswered(false);
		} else {
			onEndSession(time * 1000);
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
							{formatHhMmSs(time)}
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
						{currentQuestion.options.map((option, index) => (
							<button
								type="button"
								key={option}
								onClick={() => handleSelectAnswer()}
								disabled={isAnswered}
								className={cn(
									"p-6 flex items-center w-full space-x-4 rounded-xl border-2 text-left transition-all text-lg",
									isAnswered
										? "cursor-not-allowed opacity-60"
										: "cursor-pointer hover:bg-muted/50 hover:border-primary/50"
								)}
							>
								<div className="w-8 h-8 rounded-full border-2 border-primary flex-shrink-0 flex items-center justify-center font-bold text-primary">
									{String.fromCharCode(65 + index)}
								</div>
								<span className="flex-1">{option}</span>
							</button>
						))}
					</div>

					{/* Action Button */}
					<div className="flex justify-center">
						<Button
							onClick={handleNextQuestion}
							disabled={!isAnswered}
							size="lg"
							className="px-8 py-4 text-lg"
						>
							{isAnswered
								? currentQuestionIndex < questions.length - 1
									? "Next Question"
									: "Finish Session"
								: "Answer to Continue"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
