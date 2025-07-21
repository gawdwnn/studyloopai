"use client";

import { SessionProgressIndicator } from "@/components/session";
import type {
	CuecardConfig,
	CuecardFeedback,
} from "@/stores/cuecard-session/types";
import { useCuecardSession } from "@/stores/cuecard-session/use-cuecard-session";
import { useSessionManager } from "@/stores/session-manager/use-session-manager";
import { differenceInMinutes } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SessionRecoveryDialog } from "../session/session-recovery-dialog";
import { CuecardDisplay } from "./cuecard-display";
import { CuecardResultsView } from "./cuecard-results-view";
import { CuecardSessionSetup } from "./cuecard-session-setup";

type Course = {
	id: string;
	name: string;
	description: string | null;
};

interface CuecardSessionManagerProps {
	courses: Course[];
}

export function CuecardSessionManager({ courses }: CuecardSessionManagerProps) {
	const sessionManager = useSessionManager((s) => s);
	const cuecardSession = useCuecardSession((s) => s);
	const {
		startSession: startCuecardSession,
		resetSession: resetCuecardSession,
		submitFeedback,
	} = cuecardSession.actions;
	const {
		startSession: startManagerSession,
		endSession: endManagerSession,
		recoverSession,
	} = sessionManager.actions;

	const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
	const [hasCheckedRecovery, setHasCheckedRecovery] = useState(false);

	useEffect(() => {
		if (!hasCheckedRecovery) {
			const check = async () => {
				const recoverable = await recoverSession();
				if (recoverable && recoverable.type === "cuecards") {
					setShowRecoveryDialog(true);
				}
				setHasCheckedRecovery(true);
			};
			check();
		}
	}, [hasCheckedRecovery, recoverSession]);

	const handleStartSession = async (config: CuecardConfig) => {
		try {
			await startManagerSession("cuecards", config);
			await startCuecardSession(config);
			toast.success("Cuecard session started!");
		} catch (error) {
			console.error(error);
			toast.error("Failed to start session. Please try again.");
		}
	};

	const handleCardFeedback = (feedback: CuecardFeedback) => {
		if (cuecardSession.status !== "active") return;
		const card = cuecardSession.currentCard;
		if (!card) return;
		submitFeedback(card.id, feedback, 1000); // timeSpent is not tracked per card yet
	};

	const handleEndSession = async () => {
		if (sessionManager.activeSession) {
			const finalStats = {
				totalTime:
					Date.now() - sessionManager.activeSession.startedAt.getTime(),
				itemsCompleted: cuecardSession.progress.currentIndex + 1,
				accuracy: cuecardSession.performance.accuracy,
			};
			await endManagerSession(sessionManager.activeSession.id, finalStats);
		}
		resetCuecardSession();
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

	if (cuecardSession.status === "idle" || cuecardSession.status === "failed") {
		return (
			<CuecardSessionSetup
				courses={courses}
				onStartSession={handleStartSession}
				onClose={() => {
					/* no-op */
				}}
			/>
		);
	}

	if (cuecardSession.status === "active" && cuecardSession.currentCard) {
		return (
			<div className="relative flex h-full flex-1 flex-col">
				{process.env.NODE_ENV === "development" && <SessionProgressIndicator />}
				<div className="flex-1 overflow-y-auto">
					<CuecardDisplay
						card={cuecardSession.currentCard}
						onFeedback={handleCardFeedback}
						onClose={handleEndSession}
						currentIndex={cuecardSession.progress.currentIndex}
						totalCards={cuecardSession.progress.totalCards}
						weekInfo={cuecardSession.currentCard.source}
					/>
				</div>
			</div>
		);
	}

	if (cuecardSession.status === "completed") {
		const { progress } = cuecardSession;
		const sessionTime = sessionManager.activeSession
			? differenceInMinutes(new Date(), sessionManager.activeSession.startedAt)
			: 0;
		const totalResponses =
			progress.correctAnswers +
			progress.incorrectAnswers +
			progress.knewSomeAnswers;
		const avgTime =
			totalResponses > 0 && sessionManager.activeSession
				? (Date.now() - sessionManager.activeSession.startedAt.getTime()) /
					totalResponses /
					1000
				: 0;

		const resultsData = {
			totalCards: progress.totalCards,
			tooEasy: progress.correctAnswers,
			showAnswer: progress.knewSomeAnswers,
			incorrect: progress.incorrectAnswers,
			sessionTime: sessionTime < 1 ? "< 1 min" : `${sessionTime} min`,
			avgPerCard: `${Math.round(avgTime)} sec`,
			weekInfo: cuecardSession.cards[0]?.source || "Various Materials",
		};

		return (
			<CuecardResultsView
				results={resultsData}
				onNewSession={handleEndSession}
			/>
		);
	}

	return null; // Or a loading skeleton
}
