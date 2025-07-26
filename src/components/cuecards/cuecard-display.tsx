"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { UserCuecard } from "@/lib/actions/cuecard";
import type { CuecardFeedback } from "@/stores/cuecard-session/types";
import { X } from "lucide-react";
import { useState } from "react";

interface CuecardDisplayProps {
	card: UserCuecard;
	onFeedback: (feedback: CuecardFeedback) => void;
	onClose: () => void;
	currentIndex: number;
	totalCards: number;
	weekInfo: string;
}

export function CuecardDisplay({
	card,
	onFeedback,
	onClose,
	currentIndex,
	totalCards,
	weekInfo,
}: CuecardDisplayProps) {
	const [showAnswer, setShowAnswer] = useState(false);
	const [viewMode, setViewMode] = useState<"answer" | "question">("answer");
	const [showUserInput, setShowUserInput] = useState(false);
	const [userAnswer, setUserAnswer] = useState("");

	const handleShowAnswer = () => {
		setShowAnswer(true);
	};

	const handleFeedback = (feedback: CuecardFeedback) => {
		onFeedback(feedback);
		setShowAnswer(false);
		setViewMode("answer");
		setUserAnswer("");
	};

	return (
		<div className="bg-background mt-10 max-w-4xl mx-auto">
			<Card className="w-full relative">
				<Button
					variant="ghost"
					size="icon"
					className="absolute top-2 right-2 z-10 bg-muted hover:bg-muted/80 rounded-full"
					onClick={onClose}
				>
					<X className="h-4 w-4 text-muted-foreground" />
				</Button>

				<CardHeader className="text-center pb-2 pt-4">
					<div className="flex justify-between items-center mb-4">
						<div className="text-sm text-muted-foreground">{weekInfo}</div>
						<div className="text-sm text-muted-foreground">
							{currentIndex + 1} / {totalCards}
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-8">
					{/* Toggle between Definition and Keyword views */}
					<div className="text-center">
						<CardTitle className="text-2xl font-semibold mb-6">
							{viewMode === "answer" ? "Answer" : "Question"}
						</CardTitle>

						<div className="min-h-[200px] flex items-center justify-center">
							<p className="text-lg text-center leading-relaxed max-w-3xl">
								{viewMode === "answer" ? card.answer : card.question}
							</p>
						</div>
					</div>

					{/* User answer input toggle */}
					{!showAnswer && (
						<div className="flex items-center justify-center space-x-3">
							<Switch
								id="user-input"
								checked={showUserInput}
								onCheckedChange={setShowUserInput}
							/>
							<label htmlFor="user-input" className="text-sm font-medium">
								Enter your answer (optional)
							</label>
						</div>
					)}

					{/* User answer input */}
					{showUserInput && !showAnswer && (
						<div className="space-y-2">
							<label htmlFor="user-answer" className="text-sm font-medium">
								Your answer:
							</label>
							<Textarea
								id="user-answer"
								placeholder="Type your answer here..."
								value={userAnswer}
								onChange={(e) => setUserAnswer(e.target.value)}
								className="min-h-[100px]"
							/>
						</div>
					)}

					{/* Action buttons */}
					<div className="flex flex-col items-center space-y-4">
						{showAnswer ? (
							<>
								<div className="text-center mb-4">
									<p className="text-sm font-medium mb-2">
										{viewMode === "answer"
											? "Correct question"
											: "Correct answer"}
									</p>
									<p className="text-muted-foreground">
										{viewMode === "answer" ? card.question : card.answer}
									</p>
								</div>

								{/* Show user's answer if they provided one */}
								{userAnswer && (
									<div className="w-full max-w-2xl p-4 bg-muted rounded-lg mb-4">
										<p className="text-sm font-medium mb-2">Your answer:</p>
										<p className="text-sm">{userAnswer}</p>
									</div>
								)}

								<div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
									<Button
										onClick={() => handleFeedback("too_easy")}
										variant="default"
										className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
									>
										Too easy
									</Button>
									<Button
										onClick={() => handleFeedback("knew_some")}
										variant="outline"
										className="flex-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800"
									>
										I knew some of it
									</Button>
									<Button
										onClick={() => handleFeedback("incorrect")}
										variant="destructive"
										className="flex-1"
									>
										I answered incorrectly
									</Button>
								</div>
							</>
						) : (
							<Button
								onClick={handleShowAnswer}
								disabled={showAnswer}
								className="px-8 py-3 text-base font-medium"
							>
								Show answer
							</Button>
						)}

						<div className="text-xs text-muted-foreground mt-4">
							* Keywords and definitions can be edited or deleted from the Notes
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
