"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { env } from "@/env";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("mcq:session-manager");

import type { MCQAvailability, UserMCQ } from "@/lib/actions/mcq";
import type { McqConfig } from "@/stores/mcq-session/types";
import { useMcqSession } from "@/stores/mcq-session/use-mcq-session";
import type { Course, CourseWeek } from "@/types/database-types";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { useRealtimeRun } from "@trigger.dev/react-hooks";

import { McqQuizView } from "./mcq-quiz-view";
import { McqResultsView } from "./mcq-results-view";
import { McqSessionSetup } from "./mcq-session-setup";
// Import from colocation structure
import {
	hasNoContentForWeeks,
	isActiveState,
	isCompletedState,
	isGenerating,
	isSetupState,
} from "./utils/session-states";

interface MCQSessionManagerProps {
	courses: Course[];
	initialData?: {
		courseId: string;
		weekIds: string[]; // Store the initial week selection for proper cache comparison
		weeks: CourseWeek[];
		mcqs: UserMCQ[];
		availability: MCQAvailability;
	} | null;
}

export function McqSessionManager({
	courses,
	initialData,
}: MCQSessionManagerProps) {
	// Use shallow equality check to prevent unnecessary re-renders
	const mcqState = useMcqSession(
		useShallow((s) => ({
			status: s.status,
			currentIndex: s.progress.currentIndex,
			questions: s.questions,
			progress: s.progress,
			performance: s.performance,
			currentQuestion: s.currentQuestion,
			config: s.config,
			error: s.error,
			isLoading: s.isLoading,
			generationRunId: s.generationRunId,
			generationToken: s.generationToken,
		}))
	);

	const mcqActions = useMcqSession((state) => state.actions);

	// Generation progress tracking
	const [generationInProgress, setGenerationInProgress] = useState(false);

	// Real-time run tracking for content generation
	const { run: realtimeRun, error: realtimeError } = useRealtimeRun(
		mcqState.generationRunId || undefined,
		{
			accessToken: mcqState.generationToken || "",
			baseURL: env.NEXT_PUBLIC_TRIGGER_API_URL,
			enabled: Boolean(mcqState.generationRunId && mcqState.generationToken),
		}
	);

	// Handle generation progress updates
	useEffect(() => {
		if (realtimeRun) {
			if (realtimeRun.status === "COMPLETED" && generationInProgress) {
				setGenerationInProgress(false);
				toast.success("MCQ generation completed successfully!");
				// Trigger data refetch or update
				// TODO: Implement refetch mechanism
			} else if (realtimeRun.status === "FAILED") {
				setGenerationInProgress(false);
				toast.error("MCQ generation failed. Please try again.");
				mcqActions.setError("Generation failed");
			}
		}
	}, [realtimeRun, generationInProgress, mcqActions]);

	// Handle real-time errors
	useEffect(() => {
		if (realtimeError) {
			setGenerationInProgress(false);
			toast.error("Generation tracking failed");
		}
	}, [realtimeError]);

	const _handleStartSession = useCallback(
		async (config: McqConfig) => {
			try {
				// Check if we have pre-loaded data that matches the config
				const hasMatchingData =
					initialData?.courseId === config.courseId &&
					(config.weeks.length === 0 ||
						(initialData.weekIds.length === 0 && config.weeks.length === 0) ||
						config.weeks.every((weekId) =>
							initialData.weekIds.includes(weekId)
						));

				if (
					hasMatchingData &&
					initialData.mcqs &&
					initialData.mcqs.length > 0
				) {
					// Use pre-loaded data pattern - no loading state needed
					await mcqActions.startSessionWithData(config, initialData.mcqs);
					toast.success("MCQ session started!");
				} else {
					// If no matching data, show error - user should generate content first
					toast.error(
						"No MCQs available for this configuration. Please generate content first."
					);
					throw new Error("No pre-loaded MCQ data available");
				}
			} catch (error) {
				logger.error("Failed to start MCQ session", {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					config,
					context: { action: "startSession" },
				});
				toast.error("Unable to start MCQ session. Please try again.");
			}
		},
		[initialData, mcqActions]
	);

	const handleEndSession = useCallback(() => {
		mcqActions.endSession();
		toast.success("MCQ session ended");
	}, [mcqActions]);

	const handleResetSession = useCallback(() => {
		mcqActions.resetSession();
	}, [mcqActions]);

	const handleGenerateContent = useCallback(
		async (
			courseId: string,
			weekIds: string[],
			config: SelectiveGenerationConfig
		) => {
			try {
				setGenerationInProgress(true);
				toast.success("MCQ generation started...");

				// Use the store's triggerGeneration action
				const result = await mcqActions.triggerGeneration(
					courseId,
					weekIds,
					config
				);

				if (result.success) {
					toast.success("MCQ generation started! This may take a few minutes.");
					// Realtime tracking will automatically start via useRealtimeRun hook
					// when generationRunId and generationToken are set in the store
				} else {
					setGenerationInProgress(false);
					toast.error("Failed to start MCQ generation. Please try again.");
				}
			} catch (error) {
				setGenerationInProgress(false);
				logger.error("Failed to generate MCQs", {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					courseId,
					weekIds,
					config,
					context: { action: "generateContent" },
				});
				toast.error("Unable to generate MCQs. Please try again.");
			}
		},
		[mcqActions]
	);

	// State-driven rendering using utilities
	if (isSetupState(mcqState.status)) {
		return (
			<McqSessionSetup
				courses={courses}
				initialData={initialData}
				onClose={() => {
					// Close handler - could navigate back or reset
					mcqActions.resetSession();
				}}
				showGenerationProgress={
					isGenerating(mcqState.status) || generationInProgress
				}
				generationProgress={
					realtimeRun
						? {
								status: realtimeRun.status || "unknown",
								updatedAt: realtimeRun.updatedAt
									? new Date(realtimeRun.updatedAt)
									: undefined,
							}
						: null
				}
				onTriggerGeneration={handleGenerateContent}
			/>
		);
	}

	if (isActiveState(mcqState.status)) {
		return (
			<div className="relative flex h-full flex-1 flex-col">
				<div className="flex-1 overflow-y-auto">
					<McqQuizView
						questions={mcqState.questions}
						config={mcqState.config}
						onQuestionAnswer={(
							questionId: string,
							selectedAnswer: string | null,
							timeSpent: number
						) => {
							mcqActions.submitAnswer(questionId, selectedAnswer, timeSpent);
						}}
						onEndSession={(_totalTime: number) => {
							handleEndSession();
						}}
						onClose={handleEndSession}
					/>
				</div>
			</div>
		);
	}

	if (isCompletedState(mcqState.status)) {
		// Transform the state data to match McqResultsView expected format
		const resultsData = {
			score: Math.round(mcqState.performance.accuracy),
			skipped: mcqState.progress.skippedQuestions,
			totalTime: `${Math.floor(mcqState.progress.timeSpent / 60000)}:${Math.floor(
				(mcqState.progress.timeSpent % 60000) / 1000
			)
				.toString()
				.padStart(2, "0")}`,
			timeOnExercise: `${Math.floor(mcqState.progress.timeSpent / 60000)}:${Math.floor(
				(mcqState.progress.timeSpent % 60000) / 1000
			)
				.toString()
				.padStart(2, "0")}`,
			avgPerExercise: `${Math.floor(mcqState.progress.averageTimePerQuestion / 1000)}s`,
			questions: mcqState.questions.map((question, _index) => {
				const answer = mcqState.progress.answers.find(
					(a) => a.questionId === question.id
				);
				return {
					question: question.question,
					time: answer ? `${Math.floor(answer.timeSpent / 1000)}s` : "0s",
					correct: answer?.isCorrect || false,
					userAnswer: answer?.selectedAnswer || null,
					correctAnswer: question.correctAnswer,
					options: question.options,
					explanation: question.explanation,
				};
			}),
		};

		return (
			<McqResultsView results={resultsData} onRestart={handleResetSession} />
		);
	}

	// Loading states
	if (mcqState.status === "loading" || mcqState.isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
					<p className="text-lg font-medium mb-2">Loading MCQ session...</p>
					<p className="text-muted-foreground">Preparing your questions</p>
				</div>
			</div>
		);
	}

	// Generation in progress
	if (isGenerating(mcqState.status) || generationInProgress) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-pulse rounded-full h-12 w-12 bg-primary/20 mx-auto mb-4 flex items-center justify-center">
						<div className="w-6 h-6 rounded-full bg-primary animate-bounce" />
					</div>
					<p className="text-lg font-medium mb-2">Generating MCQs...</p>
					<p className="text-muted-foreground">
						This may take a few minutes. Please wait.
					</p>
					{realtimeRun?.status && (
						<p className="text-sm text-muted-foreground mt-2">
							Status: {realtimeRun.status}
						</p>
					)}
				</div>
			</div>
		);
	}

	// No content for selected weeks
	if (hasNoContentForWeeks(mcqState.status)) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="rounded-full h-12 w-12 bg-muted mx-auto mb-4 flex items-center justify-center">
						<span className="text-2xl">📚</span>
					</div>
					<p className="text-lg font-medium mb-2">No MCQs Available</p>
					<p className="text-muted-foreground mb-4">
						No MCQs found for the selected weeks.
					</p>
					<button
						type="button"
						onClick={handleResetSession}
						className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
					>
						Choose Different Weeks
					</button>
				</div>
			</div>
		);
	}

	// Error states
	if (mcqState.error) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="rounded-full h-12 w-12 bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
						<span className="text-2xl text-destructive">⚠️</span>
					</div>
					<p className="text-lg font-medium mb-2 text-destructive">
						Session Error
					</p>
					<p className="text-muted-foreground mb-4">{mcqState.error}</p>
					<div className="space-x-2">
						<button
							type="button"
							onClick={() => mcqActions.clearError()}
							className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
						>
							Try Again
						</button>
						<button
							type="button"
							onClick={handleResetSession}
							className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
						>
							Start Over
						</button>
					</div>
				</div>
			</div>
		);
	}

	// Fallback
	return (
		<div className="flex items-center justify-center min-h-[400px]">
			<div className="text-center">
				<p className="text-muted-foreground">Initializing MCQ session...</p>
			</div>
		</div>
	);
}
