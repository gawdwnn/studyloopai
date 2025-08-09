export interface TimerState {
	// Session timing
	sessionElapsedTime: number; // Total session time in milliseconds (live updating)
	sessionStartTime: Date | null; // When session started
	isTimerRunning: boolean; // Whether session timer is running
	isTimerPaused: boolean; // Whether session timer is paused

	// Item timing (current question/card)
	itemElapsedTime: number; // Current item time in milliseconds (live updating)
	itemStartTime: Date | null; // When current item started

	// Analytics
	averageItemTime: number; // Average time per item in milliseconds
	completedItemsCount: number; // Number of completed items
	totalItemTime: number; // Total time spent on all completed items
}

export interface TimerActions {
	// Session controls
	startTimer: () => void; // Start session timer
	pauseTimer: () => void; // Pause session timer
	resumeTimer: () => void; // Resume session timer
	resetTimer: () => void; // Reset all timer state

	// Item controls
	startItem: () => void; // Start timing current item
	finishItem: () => number; // Finish current item, returns elapsed time in ms

	// Internal update function (called by timer interval)
	_updateTimers: () => void; // Internal function for live updates
}

// Timer hook return types
export interface SessionTimerHook {
	// Time values (formatted for display)
	formattedSessionTime: string; // "HH:MM:SS"
	shortFormattedSessionTime: string; // "MM:SS"

	// Raw values
	sessionElapsedTime: number; // milliseconds
	averageItemTime: number; // milliseconds
	completedItemsCount: number;

	// State
	isTimerRunning: boolean;
	isTimerPaused: boolean;

	// Controls (bound to store actions)
	startTimer: () => void;
	pauseTimer: () => void;
	resumeTimer: () => void;
	resetTimer: () => void;
}

export interface ItemTimerHook {
	// Time values (formatted for display)
	formattedItemTime: string; // "MM:SS"

	// Raw values
	itemElapsedTime: number; // milliseconds

	// Controls (bound to store actions)
	startItem: () => void;
	finishItem: () => number; // returns elapsed time in ms
}
