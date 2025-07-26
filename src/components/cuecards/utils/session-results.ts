import { differenceInMinutes } from "date-fns";
import type { CuecardFeedback, SessionResults } from "../types";

export interface SessionResponse {
	feedback: CuecardFeedback;
}

export interface SessionCard {
	weekNumber?: number;
}

export function formatSessionResultsForDisplay(
	cards: SessionCard[],
	responses: SessionResponse[],
	startTime: Date | null
): SessionResults {
	// Calculate feedback counts
	const tooEasy = responses.filter((r) => r.feedback === "too_easy").length;
	const knewSome = responses.filter((r) => r.feedback === "knew_some").length;
	const incorrect = responses.filter((r) => r.feedback === "incorrect").length;

	// Calculate timing - handle invalid/null startTime
	let sessionTime = 0;
	let sessionTimeString = "0 min";
	let avgTime = 0;

	if (startTime && responses.length > 0) {
		const now = new Date();
		const timeDiff = Math.abs(differenceInMinutes(now, startTime));

		// Only use the time if it's reasonable (less than 24 hours)
		if (timeDiff < 1440) {
			sessionTime = timeDiff;
			sessionTimeString = sessionTime < 1 ? "< 1 min" : `${sessionTime} min`;
			avgTime = Math.round(
				(now.getTime() - startTime.getTime()) / responses.length / 1000
			);
		}
	}

	// Determine week info
	const weekInfo =
		cards.length > 0 ? `Week ${cards[0]?.weekNumber || "Various"}` : "No weeks";

	return {
		totalCards: cards.length,
		tooEasy,
		showAnswer: knewSome,
		incorrect,
		sessionTime: sessionTimeString,
		avgPerCard: `${avgTime} sec`,
		weekInfo,
	};
}
