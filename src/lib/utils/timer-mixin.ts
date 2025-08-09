import type { TimerActions, TimerState } from "@/types/timer-types";
import { formatDuration, intervalToDuration } from "date-fns";
import ms from "ms";

/**
 * Simplified timer middleware for Zustand stores
 * Uses libraries (date-fns, ms) for time operations instead of custom logic
 */
export function createTimerMixin<T extends Record<string, unknown>>(
	initialState: T
): T & TimerState {
	return {
		...initialState,
		// Session timing
		sessionElapsedTime: 0,
		sessionStartTime: null,
		isTimerRunning: false,
		isTimerPaused: false,
		// Item timing
		itemElapsedTime: 0,
		itemStartTime: null,
		// Analytics
		averageItemTime: 0,
		completedItemsCount: 0,
		totalItemTime: 0,
	};
}

/**
 * Creates simplified timer actions using libraries for complex operations
 */
export function createTimerActions(
	// biome-ignore lint/suspicious/noExplicitAny: Zustand set function signature
	set: (updater: any) => void,
	// biome-ignore lint/suspicious/noExplicitAny: Zustand get function signature
	get: () => any
): TimerActions {
	return {
		/**
		 * Start session timer
		 */
		startTimer: () => {
			const now = new Date();
			set(() => ({
				sessionStartTime: now,
				sessionElapsedTime: 0,
				isTimerRunning: true,
				isTimerPaused: false,
			}));
		},

		/**
		 * Pause session timer
		 */
		pauseTimer: () => {
			const state = get() as TimerState;
			const now = Date.now();

			// Capture current elapsed time
			const sessionTime = state.sessionStartTime
				? now - state.sessionStartTime.getTime()
				: 0;
			const itemTime = state.itemStartTime
				? now - state.itemStartTime.getTime()
				: 0;

			set(() => ({
				sessionElapsedTime: sessionTime,
				itemElapsedTime: itemTime,
				isTimerPaused: true,
			}));
		},

		/**
		 * Resume session timer
		 */
		resumeTimer: () => {
			const state = get() as TimerState;
			if (!state.isTimerRunning) return;

			const now = new Date();
			// Adjust start times based on captured elapsed times
			const sessionStart = new Date(now.getTime() - state.sessionElapsedTime);
			const itemStart = state.itemStartTime
				? new Date(now.getTime() - state.itemElapsedTime)
				: null;

			set(() => ({
				sessionStartTime: sessionStart,
				itemStartTime: itemStart,
				isTimerPaused: false,
			}));
		},

		/**
		 * Start timing a new item
		 */
		startItem: () => {
			const now = new Date();
			set(() => ({
				itemStartTime: now,
				itemElapsedTime: 0,
			}));
		},

		/**
		 * Finish current item and update analytics
		 */
		finishItem: (): number => {
			const state = get() as TimerState;
			const itemTime = state.itemElapsedTime || 0;

			// Update analytics using simple math
			const newCompletedCount = state.completedItemsCount + 1;
			const newTotalTime = state.totalItemTime + itemTime;
			const newAverage =
				newCompletedCount > 0
					? Math.round(newTotalTime / newCompletedCount)
					: 0;

			set(() => ({
				completedItemsCount: newCompletedCount,
				totalItemTime: newTotalTime,
				averageItemTime: newAverage,
				itemStartTime: null,
				itemElapsedTime: 0,
			}));

			return itemTime;
		},

		/**
		 * Reset all timer state
		 */
		resetTimer: () => {
			set(() => ({
				sessionElapsedTime: 0,
				sessionStartTime: null,
				isTimerRunning: false,
				isTimerPaused: false,
				itemElapsedTime: 0,
				itemStartTime: null,
				averageItemTime: 0,
				completedItemsCount: 0,
				totalItemTime: 0,
			}));
		},

		/**
		 * Update timer values (called by hooks for live updates)
		 */
		_updateTimers: () => {
			const state = get() as TimerState;
			if (!state.isTimerRunning || state.isTimerPaused) return;

			const now = Date.now();
			const updates: Partial<TimerState> = {};

			// Update session elapsed time
			if (state.sessionStartTime) {
				updates.sessionElapsedTime = now - state.sessionStartTime.getTime();
			}

			// Update item elapsed time
			if (state.itemStartTime) {
				updates.itemElapsedTime = now - state.itemStartTime.getTime();
			}

			// Apply updates if any
			if (Object.keys(updates).length > 0) {
				set(() => updates);
			}
		},
	};
}

/**
 * Format milliseconds to human readable string using date-fns
 */
export function formatTimeWithLibrary(
	milliseconds: number,
	format: "HH:MM:SS" | "MM:SS" | "SS" = "MM:SS"
): string {
	const duration = intervalToDuration({ start: 0, end: milliseconds });

	switch (format) {
		case "HH:MM:SS":
			return formatDuration(duration, {
				format: ["hours", "minutes", "seconds"],
				zero: true,
				delimiter: ":",
			});
		case "MM:SS": {
			const totalMinutes = Math.floor(milliseconds / ms("1m"));
			const seconds = Math.floor((milliseconds % ms("1m")) / 1000);
			return `${totalMinutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
		}
		case "SS": {
			const totalSeconds = Math.floor(milliseconds / 1000);
			return totalSeconds.toString().padStart(2, "0");
		}
		default:
			return formatTimeWithLibrary(milliseconds, "MM:SS");
	}
}

/**
 * Helper to calculate timing metrics using libraries
 */
export function calculateTimingMetrics(
	responses: Array<{ timeSpent: number }>
) {
	const itemTimes = responses.map((r) => r.timeSpent).filter((t) => t > 0);

	if (itemTimes.length === 0) {
		return {
			totalSessionTime: 0,
			averageItemTime: 0,
			fastestItem: 0,
			slowestItem: 0,
			itemTimes: [],
		};
	}

	const totalSessionTime = itemTimes.reduce((sum, time) => sum + time, 0);
	const averageItemTime = Math.round(totalSessionTime / itemTimes.length);

	return {
		totalSessionTime,
		averageItemTime,
		fastestItem: Math.min(...itemTimes),
		slowestItem: Math.max(...itemTimes),
		itemTimes,
	};
}
