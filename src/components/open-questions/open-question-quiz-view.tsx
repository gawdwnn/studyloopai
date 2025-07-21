"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { OpenQuestionConfig } from "@/stores/open-question-session/types";
import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";

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
	config,
	onQuestionAnswer,
	onEndSession,
	onClose,
}: OpenQuestionQuizViewProps) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [userAnswer, setUserAnswer] = useState<string>("");
	const [isAnswered, setIsAnswered] = useState(false);
	const [showSampleAnswer, setShowSampleAnswer] = useState(false);
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

	const handleSubmitAnswer = () => {
		if (userAnswer.trim()) {
			setIsAnswered(true);
			const timeSpent = Date.now() - questionStartTime;

			// Record answer immediately in practice mode
			if (config.practiceMode === "practice") {
				onQuestionAnswer(currentQuestion.id, userAnswer.trim(), timeSpent);
				setShowSampleAnswer(true);
			}
		}
	};

	const handleSkipQuestion = () => {
		const timeSpent = Date.now() - questionStartTime;
		onQuestionAnswer(currentQuestion.id, null, timeSpent);
		handleNextQuestion();
	};

	const handleNextQuestion = () => {
		// Record answer for exam mode or if not already recorded
		if (config.practiceMode === "exam" && userAnswer.trim()) {
			const timeSpent = Date.now() - questionStartTime;
			onQuestionAnswer(currentQuestion.id, userAnswer.trim(), timeSpent);
		}

		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1);
			setUserAnswer("");
			setIsAnswered(false);
			setShowSampleAnswer(false);
		} else {
			onEndSession(time * 1000); // Convert to milliseconds
		}
	};

	const handleShowSampleAnswer = () => {
		setShowSampleAnswer(true);
	};

	const isAnswerProvided = userAnswer.trim().length > 0;

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
							className="absolute top-4 right-4 z-10 bg-muted hover:bg-muted/80 rounded-full"
						>
							<XIcon className="h-6 w-6 text-muted-foreground" />
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

					<div className="space-y-6">
						{/* Answer Input */}
						<div className="space-y-2">
							<label htmlFor="answer" className="text-sm font-medium">
								Your answer:
							</label>
							<Textarea
								id="answer"
								value={userAnswer}
								onChange={(e) => setUserAnswer(e.target.value)}
								placeholder="Type your answer here..."
								rows={4}
								className="min-h-[100px] resize-none"
								disabled={isAnswered && config.practiceMode === "practice"}
							/>
						</div>

						{/* Sample Answer Display */}
						{showSampleAnswer && (
							<div className="space-y-2 p-4 bg-muted/50 rounded-lg">
								<h3 className="text-sm font-medium">Sample Answer:</h3>
								<p className="text-sm text-muted-foreground">
									{currentQuestion.sampleAnswer}
								</p>
							</div>
						)}
					</div>

					<div className="flex justify-center space-x-4 mt-8">
						{/* Skip Button */}
						{!isAnswered && (
							<Button variant="outline" onClick={handleSkipQuestion}>
								Skip
							</Button>
						)}

						{/* Submit Answer Button */}
						{!isAnswered && (
							<Button
								onClick={handleSubmitAnswer}
								disabled={!isAnswerProvided}
								className="bg-primary text-primary-foreground hover:bg-primary/90"
							>
								Submit Answer
							</Button>
						)}

						{/* Show Sample Answer Button (Practice Mode) */}
						{config.practiceMode === "practice" &&
							isAnswered &&
							!showSampleAnswer && (
								<Button variant="outline" onClick={handleShowSampleAnswer}>
									Show Sample Answer
								</Button>
							)}

						{/* Next Question Button */}
						{isAnswered && (
							<Button
								onClick={handleNextQuestion}
								className="bg-primary text-primary-foreground hover:bg-primary/90"
							>
								{currentQuestionIndex < questions.length - 1
									? "Next Question"
									: "Finish Session"}
							</Button>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
