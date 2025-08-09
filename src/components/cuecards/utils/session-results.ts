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
	startTime: Date | null,
	sessionElapsedTime?: number // Optional session elapsed time in milliseconds from store
): SessionResults {
	// Calculate feedback counts
	const correct = responses.filter((r) => r.feedback === "correct").length;
	const incorrect = responses.filter((r) => r.feedback === "incorrect").length;

	// Calculate timing - prefer sessionElapsedTime from store, fallback to manual calculation
	let sessionTime = 0;
	let sessionTimeString = "0 min";
	let avgTime = 0;

	if (sessionElapsedTime && responses.length > 0) {
		// Use store timer (preferred method)
		const timeDiffMinutes = Math.round(sessionElapsedTime / 60000); // Convert ms to minutes
		sessionTime = timeDiffMinutes;
		sessionTimeString = sessionTime < 1 ? "< 1 min" : `${sessionTime} min`;
		avgTime = Math.round(sessionElapsedTime / responses.length / 1000); // Average per card in seconds
	} else if (startTime && responses.length > 0) {
		// Fallback to manual calculation
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
		correct,
		incorrect,
		sessionTime: sessionTimeString,
		avgPerCard: `${avgTime} sec`,
		weekInfo,
	};
}
