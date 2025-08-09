"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { env } from "@/env";
import { createLogger } from "@/lib/utils/logger";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

const logger = createLogger("mcq:session-manager");

import type { MCQAvailability, UserMCQ } from "@/lib/actions/mcq";
import type { Course, CourseWeek } from "@/types/database-types";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useMcqSession } from "./stores/use-mcq-session";

import { LoadingOverlay, McqSkeleton } from "@/components/skeleton-patterns";
// Import shared session state utilities
import {
	isActiveState,
	isCompletedState,
	isGenerating,
	isSetupState,
} from "@/lib/utils/session-states";
import { McqResultsView } from "./mcq-results-view";
import { McqSessionSetup } from "./mcq-session-setup";
import { McqQuizView } from "./mcq-session-view";

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
	const router = useRouter();

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
			learningSessionId: s.learningSessionId,
		}))
	);

	const mcqActions = useMcqSession((state) => state.actions);
	const queryClient = useQueryClient();

	// Generation progress tracking
	const [generationInProgress, setGenerationInProgress] = useState(false);

	// End session when user leaves page during active session
	useEffect(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (isActiveState(mcqState.status)) {
				// End session immediately when user tries to leave
				mcqActions.endSession().catch((error) => {
					logger.error("Failed to end session on page unload", { error });
				});

				// Show browser confirmation dialog
				event.preventDefault();
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [mcqState.status, mcqActions]);

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
				// Invalidate content-related queries to ensure UI updates properly
				queryClient.invalidateQueries({
					predicate: (query) => {
						const queryKey = query.queryKey;
						return (
							queryKey.includes("cuecards") ||
							queryKey.includes("mcq") ||
							queryKey.includes("session-data") ||
							queryKey.includes("feature-availability") ||
							queryKey.includes("course-weeks")
						);
					},
				});
				// Reset the store's generation state to clear loading state
				mcqActions.resetGenerationState();
				toast.success("MCQ generation completed successfully!");
			} else if (realtimeRun.status === "FAILED") {
				setGenerationInProgress(false);
				toast.error("MCQ generation failed. Please try again.");
			}
		}
	}, [realtimeRun, generationInProgress, mcqActions, queryClient]);

	// Handle real-time errors
	useEffect(() => {
		if (realtimeError) {
			setGenerationInProgress(false);
			toast.error("Generation tracking failed");
		}
	}, [realtimeError]);

	const handleEndSession = useCallback(async () => {
		try {
			// endSession transitions state to "completed"
			await mcqActions.endSession();
			toast.success("MCQ session completed!");

			// Don't reset or navigate immediately - let the results view show
			// Navigation will happen when user clicks "Close" or "Start New Session"
		} catch (error) {
			logger.error("Failed to end MCQ session", {
				error: error instanceof Error ? error.message : String(error),
				context: { action: "handleEndSession" },
			});
			toast.error("Failed to end session properly");
		}
	}, [mcqActions]);

	const handleResetSession = useCallback(() => {
		// Reset session state and return to setup
		mcqActions.resetSession();
	}, [mcqActions]);

	const handleClose = useCallback(() => {
		router.push("/dashboard/adaptive-learning");
		mcqActions.resetSession();
	}, [router, mcqActions]);

	const handleCloseToFeedback = useCallback(() => {
		const sessionId = mcqState.learningSessionId;
		if (sessionId) {
			router.push(`/dashboard/feedback?sessionId=${sessionId}`);
		} else {
			router.push("/dashboard/feedback");
		}

		// Reset session after navigation
		mcqActions.resetSession();
	}, [router, mcqActions, mcqState.learningSessionId]);

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
				onClose={handleClose}
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
			<McqQuizView
				questions={mcqState.questions}
				config={mcqState.config}
				onQuestionAnswer={async (
					questionId: string,
					selectedAnswer: string | null,
					timeSpent?: number // Optional - store will provide it
				) => {
					await mcqActions.submitAnswer(questionId, selectedAnswer, timeSpent);
				}}
				onSkipQuestion={async (
					questionId: string,
					timeSpent?: number // Optional - store will provide it
				) => {
					await mcqActions.skipQuestion(questionId, timeSpent);
				}}
				onEndSession={handleEndSession}
				onClose={handleEndSession}
			/>
		);
	}

	if (isCompletedState(mcqState.status)) {
		// Ensure sessionId exists before showing results
		if (!mcqState.learningSessionId) {
			console.error("No session ID available for results view");
			toast.error("Session data not available. Please restart the session.");
			handleResetSession();
			return null;
		}

		return (
			<McqResultsView
				sessionId={mcqState.learningSessionId}
				onRestart={handleResetSession}
				onClose={handleCloseToFeedback}
			/>
		);
	}

	// Loading states
	if (mcqState.status === "loading" || mcqState.isLoading) {
		return <McqSkeleton />;
	}

	// Fallback
	return (
		<div className="min-h-screen bg-background flex items-center justify-center">
			<LoadingOverlay message="Initializing MCQ session..." />
		</div>
	);
}
