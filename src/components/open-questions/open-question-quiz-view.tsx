"use client";

import { FullscreenButton } from "@/components/fullscreen-button";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { formatHhMmSs } from "@/lib/utils/time-formatter";
import type { OpenQuestionConfig } from "@/stores/open-question-session/types";
import { XIcon } from "lucide-react";
import { useState } from "react";

interface OpenQuestion {
	id: string;
	question: string;
	sampleAnswer: string;
	difficulty: "easy" | "medium" | "hard";
	source: string;
	week: string;
}

type OpenQuestionQuizViewProps = {
	questions: OpenQuestion[];
	config: OpenQuestionConfig;
	onQuestionAnswer: (
		questionId: string,
		userAnswer: string | null,
		timeSpent: number
	) => void;
	onEndSession: (totalTime: number) => void;
	onClose: () => void;
};

export function OpenQuestionQuizView({
	questions,
	onEndSession,
	onClose,
}: OpenQuestionQuizViewProps) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [userAnswer, setUserAnswer] = useState<string>("");
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
						Open questions need to be loaded from the database.
					</p>
					<Button onClick={onClose} size="lg">
						Close
					</Button>
				</div>
			</div>
		);
	}

	const currentQuestion = questions[currentQuestionIndex];

	const handleSubmitAnswer = () => {
		if (userAnswer.trim()) {
			setIsAnswered(true);
			// TODO: Implement answer handling after database integration
		}
	};

	const handleSkipQuestion = () => {
		// TODO: Implement skip functionality after database integration
		handleNextQuestion();
	};

	const handleNextQuestion = () => {
		// TODO: Implement navigation after database integration
		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1);
			setUserAnswer("");
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
					{/* Progress Bar */}
					<div className="mb-8">
						<Progress
							value={((currentQuestionIndex + 1) / questions.length) * 100}
							className="h-2"
						/>
					</div>

					{/* Timer and Progress */}
					<div className="flex justify-between items-center mb-8">
						<Button variant="ghost" className="text-lg">
							Pause
						</Button>
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

					{/* Answer Section */}
					<div className="space-y-6 mb-12">
						<div>
							<label
								htmlFor="answer-textarea"
								className="block text-lg font-medium mb-4"
							>
								Your Answer
							</label>
							<Textarea
								id="answer-textarea"
								value={userAnswer}
								onChange={(e) => setUserAnswer(e.target.value)}
								placeholder="Type your answer here..."
								className="min-h-[200px] text-lg p-4"
								disabled={isAnswered}
							/>
						</div>

						{/* TODO: Implement sample answer display after database integration */}
					</div>

					{/* Action Buttons */}
					<div className="flex justify-center space-x-4">
						<Button variant="outline" size="lg" onClick={handleSkipQuestion}>
							Skip
						</Button>
						<Button
							size="lg"
							onClick={handleSubmitAnswer}
							disabled={!userAnswer.trim() || isAnswered}
							className="px-8"
						>
							Submit Answer
						</Button>
						<Button
							size="lg"
							onClick={handleNextQuestion}
							disabled={!isAnswered}
						>
							{currentQuestionIndex < questions.length - 1
								? "Next Question"
								: "Finish Session"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
