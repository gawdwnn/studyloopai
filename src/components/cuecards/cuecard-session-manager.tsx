"use client";

import type { CuecardAvailability, UserCuecard } from "@/lib/actions/cuecard";
import { useCuecardSession } from "@/stores/cuecard-session/use-cuecard-session";
import { useSessionManager } from "@/stores/session-manager/use-session-manager";
import type { Course, CourseWeek } from "@/types/database-types";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { SessionRecoveryDialog } from "../session/session-recovery-dialog";
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
		}))
	);
	const cuecardActions = useCuecardSession((s) => s.actions);
	const sessionManagerActions = useSessionManager((s) => s.actions);

	const [hasCheckedRecovery, setHasCheckedRecovery] = useState(false);
	const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);

	// Recovery effect
	useEffect(() => {
		if (!hasCheckedRecovery) {
			const check = async () => {
				const recoverable = await sessionManagerActions.recoverSession();
				if (recoverable && recoverable.type === "cuecards") {
					setShowRecoveryDialog(true);
				}
				setHasCheckedRecovery(true);
			};
			check();
		}
	}, [hasCheckedRecovery, sessionManagerActions]);

	const handleTriggerGeneration = useCallback(
		async (
			_courseId: string,
			_weekIds: string[],
			_generationConfig: SelectiveGenerationConfig
		) => {
			try {
				const success = true;
				// COMMENTED OUT FOR TESTING!
				// const success = await cuecardActions.triggerGeneration(
				// 	courseId,
				// 	weekIds,
				// 	generationConfig
				// );

				if (success) {
					toast.success(
						"Cuecard generation started! This may take a few minutes."
					);
				} else {
					toast.error("Failed to start cuecard generation. Please try again.");
				}
			} catch (error) {
				console.error("Cuecard generation error:", error);
				toast.error("Failed to start cuecard generation. Please try again.");
			}
		},
		[]
	);

	const handleCardFeedback = useCallback(
		async (feedback: CuecardFeedback) => {
			await cuecardActions.submitFeedback(feedback);
		},
		[cuecardActions]
	);

	const handleEndSession = useCallback(async () => {
		await cuecardActions.endSession();
		cuecardActions.resetSession();
	}, [cuecardActions]);

	const handleClose = useCallback(() => {
		// Reset any active session state
		cuecardActions.resetSession();
		// Navigate back to the adaptive learning dashboard
		window.location.href = "/dashboard/adaptive-learning";
	}, [cuecardActions]);

	const handleRecover = () => {
		setShowRecoveryDialog(false);
		toast.success("Your session has been successfully recovered.");
	};

	const handleStartNew = () => {
		handleEndSession();
		setShowRecoveryDialog(false);
	};

	if (showRecoveryDialog) {
		return (
			<SessionRecoveryDialog
				isOpen={showRecoveryDialog}
				onOpenChange={setShowRecoveryDialog}
				onRecover={handleRecover}
				onStartNew={handleStartNew}
			/>
		);
	}

	// Handle setup states (idle, failed, needs_generation, etc.)
	if (isSetupState(cuecardState.status)) {
		return (
			<CuecardSessionSetup
				courses={courses}
				initialData={initialData}
				onClose={handleClose}
				showWeekSelectionError={hasNoContentForWeeks(cuecardState.status)}
				showGenerationProgress={isGenerating(cuecardState.status)}
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
				onNewSession={handleEndSession}
			/>
		);
	}

	return null; // Or a loading skeleton
}
