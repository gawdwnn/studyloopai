"use client";

import {
	CuecardSkeleton,
	LoadingOverlay,
} from "@/components/skeleton-patterns";
import { env } from "@/env";
import type { CuecardAvailability, UserCuecard } from "@/lib/actions/cuecard";
import { logger } from "@/lib/utils/logger";
import {
	hasNoContentForWeeks,
	isActiveState,
	isCompletedState,
	isGenerating,
	isSetupState,
} from "@/lib/utils/session-states";
import type { Course, CourseWeek } from "@/types/database-types";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { CuecardResultsView } from "./cuecard-results-view";
import { CuecardSessionSetup } from "./cuecard-session-setup";
import { CuecardDisplay } from "./cuecard-session-view";
import { useCuecardSession } from "./stores/use-cuecard-session";
import type { CuecardFeedback } from "./types";
import { formatSessionResultsForDisplay } from "./utils";

interface CuecardSessionManagerProps {
	courses: Course[];
	initialData?: {
		courseId: string;
		weekIds: string[]; // Store the initial week selection for proper cache comparison
		weeks: CourseWeek[];
		cuecards: UserCuecard[];
		availability: CuecardAvailability;
	} | null;
}

export function CuecardSessionManager({
	courses,
	initialData,
}: CuecardSessionManagerProps) {
	const router = useRouter();

	// Use shallow equality check to prevent unnecessary re-renders
	const cuecardState = useCuecardSession(
		useShallow((s) => ({
			status: s.status,
			currentIndex: s.currentIndex,
			cards: s.cards,
			responses: s.responses,
			startTime: s.startTime,
			sessionElapsedTime: s.sessionElapsedTime,
			generationRunId: s.generationRunId,
			generationToken: s.generationToken,
			learningSessionId: s.learningSessionId,
			isLoading: s.isLoading,
		}))
	);
	const cuecardActions = useCuecardSession((s) => s.actions);
	const queryClient = useQueryClient();

	const [isEndingSession, setIsEndingSession] = useState(false);
	const [generationInProgress, setGenerationInProgress] = useState(false);

	// Realtime tracking for cuecard generation
	const { run: runData, error: runError } = useRealtimeRun(
		cuecardState.generationRunId || undefined,
		{
			accessToken: cuecardState.generationToken || "",
			baseURL: env.NEXT_PUBLIC_TRIGGER_API_URL,
			enabled: Boolean(
				cuecardState.generationRunId && cuecardState.generationToken
			),
		}
	);

	// Handle generation progress updates
	useEffect(() => {
		if (runData) {
			if (runData.status === "COMPLETED" && generationInProgress) {
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
				cuecardActions.resetGenerationState();
				toast.success("Cuecards generated successfully!");
			} else if (runData.status === "FAILED") {
				setGenerationInProgress(false);
				toast.error("Cuecard generation failed. Please try again.");
				// Add error logging similar to MCQ
				logger.error("Cuecard generation failed", {
					status: runData.status,
					runId: cuecardState.generationRunId,
				});
			}
		}
	}, [
		runData,
		generationInProgress,
		cuecardActions,
		queryClient,
		cuecardState.generationRunId,
	]);

	// Handle generation errors
	useEffect(() => {
		if (runError) {
			logger.error("Realtime tracking error during cuecard generation", {
				message:
					runError instanceof Error ? runError.message : String(runError),
				stack: runError instanceof Error ? runError.stack : undefined,
				runId: cuecardState.generationRunId,
			});
		}
	}, [runError, cuecardState.generationRunId]);

	const handleTriggerGeneration = useCallback(
		async (
			courseId: string,
			weekIds: string[],
			generationConfig: SelectiveGenerationConfig
		) => {
			try {
				setGenerationInProgress(true);
				const result = await cuecardActions.triggerGeneration(
					courseId,
					weekIds,
					generationConfig
				);

				if (result.success) {
					toast.success(
						"Cuecard generation started! This may take a few minutes."
					);
					// Realtime tracking will automatically start via useRealtimeRun hook
					// when generationRunId and generationToken are set in the store
				} else {
					setGenerationInProgress(false);
					toast.error("Failed to start cuecard generation. Please try again.");
				}
			} catch (error) {
				setGenerationInProgress(false);
				logger.error("Failed to trigger cuecard generation", {
					message: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					courseId,
					weekIds,
					generationConfig,
				});
				toast.error("Failed to start cuecard generation. Please try again.");
			}
		},
		[cuecardActions]
	);

	const handleCardFeedback = useCallback(
		async (feedback: CuecardFeedback) => {
			// Store's submitFeedback now handles everything including session completion
			await cuecardActions.submitFeedback(feedback);
		},
		[cuecardActions]
	);

	const handleEndSession = useCallback(async () => {
		// Prevent multiple calls
		if (isEndingSession) return;
		setIsEndingSession(true);

		try {
			// Use store's endSession method which now handles all adaptive learning logic
			await cuecardActions.endSession();
		} catch (error) {
			logger.error("Failed to end cuecard session", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				sessionStatus: cuecardState.status,
				currentIndex: cuecardState.currentIndex,
			});
			toast.error("Session end failed, please try again");
		} finally {
			setIsEndingSession(false);
		}
	}, [
		cuecardActions,
		isEndingSession,
		cuecardState.status,
		cuecardState.currentIndex,
	]);

	const handleClose = useCallback(() => {
		// Navigate first, then reset session
		router.push("/dashboard/adaptive-learning");
		cuecardActions.resetSession();
	}, [router, cuecardActions]);

	const handleCloseToFeedback = useCallback(() => {
		// Navigate to feedback page with sessionId (called from results view "Close" button)
		const sessionId = cuecardState.learningSessionId;

		// Navigate FIRST, then reset session state
		if (sessionId) {
			router.push(`/dashboard/feedback?sessionId=${sessionId}`);
		} else {
			router.push("/dashboard/feedback");
		}

		// Reset session after navigation
		cuecardActions.resetSession();
	}, [router, cuecardActions, cuecardState.learningSessionId]);

	// Handle setup states (idle, failed, needs_generation, etc.)
	if (isSetupState(cuecardState.status)) {
		return (
			<CuecardSessionSetup
				courses={courses}
				initialData={initialData}
				onClose={handleClose}
				showWeekSelectionError={hasNoContentForWeeks(cuecardState.status)}
				showGenerationProgress={
					isGenerating(cuecardState.status) || generationInProgress
				}
				generationProgress={runData}
				onTriggerGeneration={handleTriggerGeneration}
			/>
		);
	}

	if (isActiveState(cuecardState.status)) {
		const currentCard = cuecardActions.getCurrentCard();
		if (!currentCard) {
			// This shouldn't happen, but handle gracefully
			handleEndSession();
			return null;
		}

		return (
			<CuecardDisplay
				card={currentCard}
				onFeedback={handleCardFeedback}
				onClose={handleEndSession}
				currentIndex={cuecardState.currentIndex}
				totalCards={cuecardState.cards.length}
				weekInfo={`Week ${currentCard.weekNumber}`}
			/>
		);
	}

	if (isCompletedState(cuecardState.status)) {
		const resultsData = formatSessionResultsForDisplay(
			cuecardState.cards,
			cuecardState.responses,
			cuecardState.startTime,
			cuecardState.sessionElapsedTime // Pass session elapsed time from store timer
		);

		return (
			<CuecardResultsView
				sessionId={cuecardState.learningSessionId || undefined}
				results={resultsData}
				onNewSession={() => cuecardActions.resetSession()}
				onClose={handleCloseToFeedback}
			/>
		);
	}

	if (cuecardState.status === "loading" || cuecardState.isLoading) {
		return <CuecardSkeleton />;
	}

	return (
		<div className="min-h-screen bg-background flex items-center justify-center">
			<LoadingOverlay message="Initializing cuecard session..." />
		</div>
	);
}
