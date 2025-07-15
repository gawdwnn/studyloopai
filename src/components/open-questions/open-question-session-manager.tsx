"use client";

import type { OpenQuestionConfig } from "@/lib/stores/open-question-session/types";
import { useOpenQuestionSession } from "@/lib/stores/open-question-session/use-open-question-session";
import { useSessionManager } from "@/lib/stores/session-manager/use-session-manager";
import { differenceInMinutes } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SessionProgressIndicator } from "../session";
import { SessionRecoveryDialog } from "../session/session-recovery-dialog";
import { OpenQuestionQuizView } from "./open-question-quiz-view";
import { OpenQuestionResultsView } from "./open-question-results-view";
import { OpenQuestionSessionSetup } from "./open-question-session-setup";

type Course = {
	id: string;
	name: string;
	description: string | null;
};

interface OpenQuestionSessionManagerProps {
	courses: Course[];
}

export function OpenQuestionSessionManager({ courses }: OpenQuestionSessionManagerProps) {
	const sessionManager = useSessionManager((s) => s);
	const openQuestionSession = useOpenQuestionSession((s) => s);
	const {
		startSession: startOpenQuestionSession,
		resetSession: resetOpenQuestionSession,
		submitAnswer,
		moveToNextQuestion,
	} = openQuestionSession.actions;
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
				if (recoverable && recoverable.type === "open-questions") {
					setShowRecoveryDialog(true);
				}
				setHasCheckedRecovery(true);
			};
			check();
		}
	}, [hasCheckedRecovery, recoverSession]);

	const handleStartSession = async (config: OpenQuestionConfig) => {
		try {
			await startManagerSession("open-questions", config);
			await startOpenQuestionSession(config);
			toast.success("Open Question session started!");
		} catch (error) {
			console.error(error);
			toast.error("Failed to start session. Please try again.");
		}
	};

	const handleQuestionAnswer = (
		questionId: string,
		userAnswer: string | null,
		timeSpent: number
	) => {
		if (openQuestionSession.status !== "active" || userAnswer === null) return;
		submitAnswer(questionId, userAnswer, timeSpent);
		if (
			openQuestionSession.progress.currentIndex <
			openQuestionSession.progress.totalQuestions - 1
		) {
			setTimeout(() => moveToNextQuestion(), 1000);
		} else {
			setTimeout(() => openQuestionSession.actions.endSession(), 1000);
			toast.success("Open Question session completed!");
		}
	};

	const handleEndSession = async () => {
		if (sessionManager.activeSession) {
			const finalStats = {
				totalTime: Date.now() - sessionManager.activeSession.startedAt.getTime(),
				itemsCompleted: openQuestionSession.progress.currentIndex + 1,
				accuracy: openQuestionSession.performance.overallScore,
			};
			await endManagerSession(sessionManager.activeSession.id, finalStats);
		}
		resetOpenQuestionSession();
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

	if (openQuestionSession.status === "idle" || openQuestionSession.status === "failed") {
		return (
			<OpenQuestionSessionSetup
				courses={courses}
				onStartSession={handleStartSession}
				onClose={() => {
					/* no-op */
				}}
			/>
		);
	}

	if (openQuestionSession.status === "active" && openQuestionSession.questions.length > 0) {
		return (
			<div className="relative flex h-full flex-1 flex-col">
				{process.env.NODE_ENV === "development" && <SessionProgressIndicator />}
				<div className="flex-1 overflow-y-auto">
					<OpenQuestionQuizView
						questions={openQuestionSession.questions}
						config={openQuestionSession.config}
						onQuestionAnswer={handleQuestionAnswer}
						onEndSession={handleEndSession}
						onClose={handleEndSession}
					/>
				</div>
			</div>
		);
	}

	if (openQuestionSession.status === "completed") {
		const { progress, questions } = openQuestionSession;
		const sessionTime = sessionManager.activeSession
			? differenceInMinutes(new Date(), sessionManager.activeSession.startedAt)
			: 0;

		const resultsData = {
			answered: progress.answeredQuestions,
			skipped: progress.skippedQuestions,
			totalTime: sessionTime < 1 ? "< 1 min" : `${sessionTime} min`,
			timeOnExercise: `${Math.round(progress.averageTimePerQuestion / 1000)} sec`,
			avgPerExercise: `${Math.round(progress.averageTimePerQuestion / 1000)} sec`,
			practiceMode: openQuestionSession.config.practiceMode,
			questions: questions.map((q) => {
				const answer = progress.answers.find((a) => a.questionId === q.id);
				return {
					question: q.question,
					time: answer ? `${Math.round(answer.timeSpent / 1000)}s` : "0s",
					userAnswer: answer?.userAnswer ?? null,
					sampleAnswer: q.sampleAnswer,
					evaluation: answer,
				};
			}),
		};

		return <OpenQuestionResultsView results={resultsData} onRestart={handleEndSession} />;
	}

	return null;
}
