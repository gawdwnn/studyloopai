"use client";

import { useCuecardSession } from "@/stores/cuecard-session/use-cuecard-session";
import { useSessionManager } from "@/stores/session-manager/use-session-manager";
import type { Course } from "@/types/database-types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SessionRecoveryDialog } from "../session/session-recovery-dialog";
import { CuecardDisplay } from "./cuecard-display";
import { CuecardResultsView } from "./cuecard-results-view";
import { CuecardSessionSetup } from "./cuecard-session-setup";
import type { CuecardConfig, CuecardFeedback } from "./types";
import { formatSessionResultsForDisplay } from "./utils";

interface CuecardSessionManagerProps {
	courses: Course[];
}

export function CuecardSessionManager({ courses }: CuecardSessionManagerProps) {
	// Prevent SSR hydration issues with Zustand
	const [isClient, setIsClient] = useState(false);
	useEffect(() => {
		setIsClient(true);
	}, []);

	// MUST CALL ALL HOOKS BEFORE ANY EARLY RETURNS - RULES OF HOOKS
	const cuecardStatus = useCuecardSession((s) => s.status);
	const cuecardCurrentIndex = useCuecardSession((s) => s.currentIndex);
	const cuecardCards = useCuecardSession((s) => s.cards);
	const cuecardResponses = useCuecardSession((s) => s.responses);
	const cuecardStartTime = useCuecardSession((s) => s.startTime);
	const cuecardActions = useCuecardSession((s) => s.actions);
	const sessionManagerActions = useSessionManager((s) => s.actions);

	// All state hooks must be called consistently
	const [hasCheckedRecovery, setHasCheckedRecovery] = useState(false);
	const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);

	// All callback and effect hooks must also be called consistently
	const handleTriggerGeneration = useCallback(
		async (
			courseId: string,
			weekIds?: string[],
			generationConfig?: import(
				"@/types/generation-types"
			).SelectiveGenerationConfig
		) => {
			try {
				const success = await cuecardActions.triggerGeneration(
					courseId,
					weekIds,
					generationConfig
				);

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
		[cuecardActions]
	);

	const handleStartSession = useCallback(
		async (config: CuecardConfig) => {
			try {
				await sessionManagerActions.startSession("cuecards", config);
				await cuecardActions.startSession(config);
				toast.success("Cuecard session started!");
			} catch (error) {
				console.error(error);
				toast.error("Failed to start session. Please try again.");
			}
		},
		[sessionManagerActions, cuecardActions]
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

	// NOW safe to do early return after all hooks are called
	if (!isClient) {
		return <div>Loading...</div>;
	}

	// Recreate the session object for compatibility with existing code
	const cuecardSession = {
		status: cuecardStatus,
		currentIndex: cuecardCurrentIndex,
		cards: cuecardCards,
		responses: cuecardResponses,
		startTime: cuecardStartTime,
		actions: cuecardActions,
	};

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
	const setupStates = [
		"idle",
		"failed",
		"needs_generation",
		"no_content_for_weeks",
		"generating",
	];
	if (setupStates.includes(cuecardSession.status)) {
		return (
			<CuecardSessionSetup
				courses={courses}
				onStartSession={handleStartSession}
				onClose={handleClose}
				showGenerationPrompt={cuecardSession.status === "needs_generation"}
				showWeekSelectionError={
					cuecardSession.status === "no_content_for_weeks"
				}
				showGenerationProgress={cuecardSession.status === "generating"}
				onTriggerGeneration={handleTriggerGeneration}
			/>
		);
	}

	if (cuecardSession.status === "active") {
		const currentCard = cuecardSession.actions.getCurrentCard();
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
						currentIndex={cuecardSession.currentIndex}
						totalCards={cuecardSession.cards.length}
						weekInfo={`Week ${currentCard.weekNumber}`}
					/>
				</div>
			</div>
		);
	}

	if (cuecardSession.status === "completed") {
		const resultsData = formatSessionResultsForDisplay(
			cuecardSession.cards,
			cuecardSession.responses,
			cuecardSession.startTime
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
