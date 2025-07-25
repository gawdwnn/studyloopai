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
	startTime: Date
): SessionResults {
	// Calculate feedback counts
	const tooEasy = responses.filter((r) => r.feedback === "too_easy").length;
	const knewSome = responses.filter((r) => r.feedback === "knew_some").length;
	const incorrect = responses.filter((r) => r.feedback === "incorrect").length;

	// Calculate timing
	const sessionTime = differenceInMinutes(new Date(), startTime);
	const sessionTimeString = sessionTime < 1 ? "< 1 min" : `${sessionTime} min`;

	const avgTime =
		responses.length > 0
			? Math.round((Date.now() - startTime.getTime()) / responses.length / 1000)
			: 0;

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
