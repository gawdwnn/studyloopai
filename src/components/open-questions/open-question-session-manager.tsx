"use client";

import type { OpenQuestionConfig } from "@/stores/open-question-session/types";
import { useOpenQuestionSession } from "@/stores/open-question-session/use-open-question-session";
import { toast } from "sonner";
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

export function OpenQuestionSessionManager({
	courses,
}: OpenQuestionSessionManagerProps) {
	const openQuestionSession = useOpenQuestionSession((s) => s);
	const { startSession, resetSession } = openQuestionSession.actions;

	const handleStartSession = async (config: OpenQuestionConfig) => {
		try {
			await startSession(config);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			toast.error(`Failed to start session: ${errorMessage}`);
		}
	};

	const handleEndSession = () => {
		resetSession();
	};

	// Setup phase - show configuration
	if (
		openQuestionSession.status === "idle" ||
		openQuestionSession.status === "failed"
	) {
		return (
			<OpenQuestionSessionSetup
				courses={courses}
				onStartSession={handleStartSession}
				onClose={() => {
					// Close handler - could navigate back or reset
				}}
			/>
		);
	}

	// Active session - show quiz interface
	if (
		openQuestionSession.status === "active" &&
		openQuestionSession.questions.length > 0
	) {
		return (
			<div className="relative flex h-full flex-1 flex-col">
				<div className="flex-1 overflow-y-auto">
					<OpenQuestionQuizView
						questions={openQuestionSession.questions}
						config={openQuestionSession.config}
						onQuestionAnswer={() => {}} // TODO: Implement after database integration
						onEndSession={handleEndSession}
						onClose={handleEndSession}
					/>
				</div>
			</div>
		);
	}

	// Completed session - show results
	if (openQuestionSession.status === "completed") {
		const resultsData = {
			answered: 0,
			skipped: 0,
			totalTime: "0 min",
			timeOnExercise: "0 sec",
			avgPerExercise: "0 sec",
			practiceMode: openQuestionSession.config.practiceMode,
			questions: [],
		};

		return (
			<OpenQuestionResultsView
				results={resultsData}
				onRestart={handleEndSession}
			/>
		);
	}

	return null;
}
