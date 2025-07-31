"use client";

import { FullscreenButton } from "@/components/fullscreen-button";
import { Button } from "@/components/ui/button";
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
		<div className="min-h-screen bg-background relative">
			<div className="absolute top-4 right-4 z-10 flex gap-2">
				<FullscreenButton />
				<Button
					variant="ghost"
					size="icon"
					className="bg-gray-100 hover:bg-gray-200 rounded-full"
					onClick={onClose}
				>
					<X className="h-6 w-6 text-gray-600" />
				</Button>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					{/* Progress Header */}
					<div className="flex justify-between items-center mb-12">
						<div className="text-lg font-medium text-muted-foreground">
							{weekInfo}
						</div>
						<div className="text-lg font-medium bg-muted px-4 py-2 rounded-lg">
							{currentIndex + 1} of {totalCards}
						</div>
					</div>

					{/* Main Content */}
					<div className="bg-card rounded-2xl p-12 border space-y-8">
						{/* Toggle between Definition and Keyword views */}
						<div className="text-center">
							<h2 className="text-3xl font-bold mb-8">
								{viewMode === "answer" ? "Answer" : "Question"}
							</h2>

							<div className="min-h-[200px] flex items-center justify-center">
								<p className="text-2xl text-center leading-relaxed max-w-3xl">
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

									<div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
										<Button
											onClick={() => handleFeedback("correct")}
											variant="default"
											className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-medium py-3"
										>
											✓ I knew this
										</Button>
										<Button
											onClick={() => handleFeedback("incorrect")}
											variant="destructive"
											className="flex-1 font-medium py-3"
										>
											✗ I didn't know this
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

							<div className="text-sm text-muted-foreground mt-8 text-center">
								* Keywords and definitions can be edited or deleted from the
								Notes
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
