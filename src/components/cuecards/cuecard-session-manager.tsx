"use client";

import { env } from "@/env";
import type { CuecardAvailability, UserCuecard } from "@/lib/actions/cuecard";
import { useCuecardSession } from "@/stores/cuecard-session/use-cuecard-session";
import type { Course, CourseWeek } from "@/types/database-types";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { CuecardDisplay } from "./cuecard-display";
import { CuecardResultsView } from "./cuecard-results-view";
import { CuecardSessionSetup } from "./cuecard-session-setup";
import type { CuecardFeedback } from "./types";
import {
	formatSessionResultsForDisplay,
	hasNoContentForWeeks,
	isActiveState,
	isCompletedState,
	isGenerating,
	isSetupState,
} from "./utils";

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
	// Use shallow equality check to prevent unnecessary re-renders
	const cuecardState = useCuecardSession(
		useShallow((s) => ({
			status: s.status,
			currentIndex: s.currentIndex,
			cards: s.cards,
			responses: s.responses,
			startTime: s.startTime,
			generationRunId: s.generationRunId,
			generationToken: s.generationToken,
		}))
	);
	const cuecardActions = useCuecardSession((s) => s.actions);

	const [isEndingSession, setIsEndingSession] = useState(false);

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

	// Handle generation completion and progress updates
	useEffect(() => {
		if (!runData || !cuecardState.generationRunId) return;

		const { status, output } = runData;

		if (status === "COMPLETED" || String(status).includes("COMPLETED")) {
			// Generation completed successfully
			toast.success("Cuecards generated successfully! Loading content...");

			// Reset generation state - this will cause the session setup to refresh
			// and detect the newly generated cuecards
			setTimeout(() => {
				cuecardActions.resetGenerationState();
			}, 2000); // Give a brief moment to show the completion message
		} else if (
			status === "CRASHED" ||
			status === "CANCELED" ||
			status === "SYSTEM_FAILURE" ||
			status === "INTERRUPTED" ||
			status === "TIMED_OUT"
		) {
			// Generation failed
			console.error("Generation failed:", output?.error);
			toast.error("Generation failed, please try again.");
		} else if (
			status === "EXECUTING" ||
			status === "QUEUED" ||
			status === "WAITING_FOR_DEPLOY"
		) {
			// Still generating - status should remain "generating"
			// This keeps the UI in the correct state showing generation progress
		}
	}, [runData, cuecardState.generationRunId, cuecardActions]);

	// Handle generation errors
	useEffect(() => {
		if (runError) {
			console.error("Realtime tracking error:", runError);
		}
	}, [runError]);

	const handleTriggerGeneration = useCallback(
		async (
			courseId: string,
			weekIds: string[],
			generationConfig: SelectiveGenerationConfig
		) => {
			try {
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
					toast.error("Failed to start cuecard generation. Please try again.");
				}
			} catch (error) {
				console.error("Cuecard generation error:", error);
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
			console.error("Failed to end session:", error);
			// Fallback navigation
			window.location.href = "/dashboard/feedback";
		} finally {
			setIsEndingSession(false);
		}
	}, [cuecardActions, isEndingSession]);

	// Session completion is now handled directly in store's submitFeedback method
	// No need for useEffect to watch for completion

	const handleClose = useCallback(() => {
		// Reset any active session state
		cuecardActions.resetSession();
		// Navigate back to the adaptive learning dashboard
		window.location.href = "/dashboard/adaptive-learning";
	}, [cuecardActions]);

	// Handle setup states (idle, failed, needs_generation, etc.)
	if (isSetupState(cuecardState.status)) {
		return (
			<CuecardSessionSetup
				courses={courses}
				initialData={initialData}
				onClose={handleClose}
				showWeekSelectionError={hasNoContentForWeeks(cuecardState.status)}
				showGenerationProgress={isGenerating(cuecardState.status)}
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
			<div className="relative flex h-full flex-1 flex-col">
				<div className="flex-1 overflow-y-auto">
					<CuecardDisplay
						card={currentCard}
						onFeedback={handleCardFeedback}
						onClose={handleEndSession}
						currentIndex={cuecardState.currentIndex}
						totalCards={cuecardState.cards.length}
						weekInfo={`Week ${currentCard.weekNumber}`}
					/>
				</div>
			</div>
		);
	}

	if (isCompletedState(cuecardState.status)) {
		const resultsData = formatSessionResultsForDisplay(
			cuecardState.cards,
			cuecardState.responses,
			cuecardState.startTime
		);

		return (
			<CuecardResultsView
				results={resultsData}
				onNewSession={() => cuecardActions.resetSession()}
			/>
		);
	}

	return null; // Or a loading skeleton
}
