"use client";

import type { McqConfig } from "@/stores/mcq-session/types";
import { useMcqSession } from "@/stores/mcq-session/use-mcq-session";
import { toast } from "sonner";
import { McqQuizView } from "./mcq-quiz-view";
import { McqResultsView } from "./mcq-results-view";
import { McqSessionSetup } from "./mcq-session-setup";

type Course = {
	id: string;
	name: string;
	description: string | null;
};

interface McqSessionManagerProps {
	courses: Course[];
}

export function McqSessionManager({ courses }: McqSessionManagerProps) {
	const mcqSession = useMcqSession((s) => s);
	const { startSession, resetSession } = mcqSession.actions;

	const handleStartSession = async (config: McqConfig) => {
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
	if (mcqSession.status === "idle" || mcqSession.status === "failed") {
		return (
			<McqSessionSetup
				courses={courses}
				onStartSession={handleStartSession}
				onClose={() => {
					// Close handler - could navigate back or reset
				}}
			/>
		);
	}

	// Active session - show quiz interface
	if (mcqSession.status === "active" && mcqSession.questions.length > 0) {
		return (
			<div className="relative flex h-full flex-1 flex-col">
				<div className="flex-1 overflow-y-auto">
					<McqQuizView
						questions={mcqSession.questions}
						config={mcqSession.config}
						onQuestionAnswer={() => {}} // TODO: Implement after database integration
						onEndSession={handleEndSession}
						onClose={handleEndSession}
					/>
				</div>
			</div>
		);
	}

	// Completed session - show results
	if (mcqSession.status === "completed") {
		const resultsData = {
			score: 0,
			skipped: 0,
			totalTime: "0 min",
			timeOnExercise: "0 sec",
			avgPerExercise: "0 sec",
			questions: [],
		};

		return (
			<McqResultsView results={resultsData} onRestart={handleEndSession} />
		);
	}

	return null;
}
