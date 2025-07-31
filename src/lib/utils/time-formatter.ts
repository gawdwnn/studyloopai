import { intervalToDuration } from "date-fns";
import ms from "ms";

/**
 * Format milliseconds to readable duration like "2m 30s"
 * Used in analytics components for session duration display
 */
export const formatDuration = (milliseconds: number): string => {
	return ms(milliseconds);
};

/**
 * Format milliseconds to MM:SS format like "02:30"
 * Used in session progress indicators and timers
 */
export const formatMmSs = (milliseconds: number): string => {
	const duration = intervalToDuration({ start: 0, end: milliseconds });
	const minutes = (duration.minutes || 0).toString().padStart(2, "0");
	const seconds = (duration.seconds || 0).toString().padStart(2, "0");
	return `${minutes}:${seconds}`;
};

/**
 * Format seconds to HH:MM:SS format like "00:02:30"
 * Used in quiz components for countdown timers
 */
export const formatHhMmSs = (seconds: number): string => {
	const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
	const hours = (duration.hours || 0).toString().padStart(2, "0");
	const minutes = (duration.minutes || 0).toString().padStart(2, "0");
	const secs = (duration.seconds || 0).toString().padStart(2, "0");
	return `${hours}:${minutes}:${secs}`;
};
