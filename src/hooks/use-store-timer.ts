"use client";

import { useCuecardSession } from "@/components/cuecards/stores/use-cuecard-session";
import { useMcqSession } from "@/components/mcqs/stores/use-mcq-session";
import { formatTimeWithLibrary } from "@/lib/utils/timer-mixin";
import type { ItemTimerHook, SessionTimerHook } from "@/types/timer-types";
import { useEffect, useMemo } from "react";

/**
 * Hook for accessing session timer from MCQ store
 * Provides live timer updates, formatted time displays, and controls
 */
export function useMcqSessionTimer(): SessionTimerHook {
	const sessionElapsedTime = useMcqSession((state) => state.sessionElapsedTime);
	const averageItemTime = useMcqSession((state) => state.averageItemTime);
	const completedItemsCount = useMcqSession(
		(state) => state.completedItemsCount
	);
	const isTimerRunning = useMcqSession((state) => state.isTimerRunning);
	const isTimerPaused = useMcqSession((state) => state.isTimerPaused);
	const updateTimers = useMcqSession((state) => state.actions._updateTimers);

	// Bind store actions
	const startTimer = useMcqSession((state) => state.actions.startTimer);
	const pauseTimer = useMcqSession((state) => state.actions.pauseTimer);
	const resumeTimer = useMcqSession((state) => state.actions.resumeTimer);
	const resetTimer = useMcqSession((state) => state.actions.resetTimer);

	// Simple live updates using useEffect - much cleaner than 294 lines!
	useEffect(() => {
		if (!isTimerRunning || isTimerPaused) return;

		const interval = setInterval(updateTimers, 100); // 100ms for smooth updates
		return () => clearInterval(interval);
	}, [isTimerRunning, isTimerPaused, updateTimers]);

	// Memoized formatted time values
	const formattedSessionTime = useMemo(
		() => formatTimeWithLibrary(sessionElapsedTime, "HH:MM:SS"),
		[sessionElapsedTime]
	);

	const shortFormattedSessionTime = useMemo(
		() => formatTimeWithLibrary(sessionElapsedTime, "MM:SS"),
		[sessionElapsedTime]
	);

	return {
		// Time values (formatted for display)
		formattedSessionTime,
		shortFormattedSessionTime,

		// Raw values
		sessionElapsedTime,
		averageItemTime,
		completedItemsCount,

		// State
		isTimerRunning,
		isTimerPaused,

		// Controls (bound to store actions)
		startTimer,
		pauseTimer,
		resumeTimer,
		resetTimer,
	};
}

/**
 * Hook for accessing item timer from MCQ store
 * Tracks timing for current question
 */
export function useMcqItemTimer(): ItemTimerHook {
	const itemElapsedTime = useMcqSession((state) => state.itemElapsedTime);

	// Bind store actions
	const startItem = useMcqSession((state) => state.actions.startItem);
	const finishItem = useMcqSession((state) => state.actions.finishItem);

	// Memoized formatted time
	const formattedItemTime = useMemo(
		() => formatTimeWithLibrary(itemElapsedTime, "MM:SS"),
		[itemElapsedTime]
	);

	return {
		// Time values (formatted for display)
		formattedItemTime,

		// Raw values
		itemElapsedTime,

		// Controls (bound to store actions)
		startItem,
		finishItem,
	};
}

/**
 * Hook for accessing session timer from Cuecard store
 * Provides live timer updates, formatted time displays, and controls
 */
export function useCuecardSessionTimer(): SessionTimerHook {
	const sessionElapsedTime = useCuecardSession(
		(state) => state.sessionElapsedTime
	);
	const averageItemTime = useCuecardSession((state) => state.averageItemTime);
	const completedItemsCount = useCuecardSession(
		(state) => state.completedItemsCount
	);
	const isTimerRunning = useCuecardSession((state) => state.isTimerRunning);
	const isTimerPaused = useCuecardSession((state) => state.isTimerPaused);
	const updateTimers = useCuecardSession(
		(state) => state.actions._updateTimers
	);

	// Bind store actions
	const startTimer = useCuecardSession((state) => state.actions.startTimer);
	const pauseTimer = useCuecardSession((state) => state.actions.pauseTimer);
	const resumeTimer = useCuecardSession((state) => state.actions.resumeTimer);
	const resetTimer = useCuecardSession((state) => state.actions.resetTimer);

	// Simple live updates using useEffect - much cleaner than 294 lines!
	useEffect(() => {
		if (!isTimerRunning || isTimerPaused) return;

		const interval = setInterval(updateTimers, 100); // 100ms for smooth updates
		return () => clearInterval(interval);
	}, [isTimerRunning, isTimerPaused, updateTimers]);

	// Memoized formatted time values
	const formattedSessionTime = useMemo(
		() => formatTimeWithLibrary(sessionElapsedTime, "HH:MM:SS"),
		[sessionElapsedTime]
	);

	const shortFormattedSessionTime = useMemo(
		() => formatTimeWithLibrary(sessionElapsedTime, "MM:SS"),
		[sessionElapsedTime]
	);

	return {
		// Time values (formatted for display)
		formattedSessionTime,
		shortFormattedSessionTime,

		// Raw values
		sessionElapsedTime,
		averageItemTime,
		completedItemsCount,

		// State
		isTimerRunning,
		isTimerPaused,

		// Controls (bound to store actions)
		startTimer,
		pauseTimer,
		resumeTimer,
		resetTimer,
	};
}

/**
 * Hook for accessing item timer from Cuecard store
 * Tracks timing for current cuecard
 */
export function useCuecardItemTimer(): ItemTimerHook {
	const itemElapsedTime = useCuecardSession((state) => state.itemElapsedTime);

	// Bind store actions
	const startItem = useCuecardSession((state) => state.actions.startItem);
	const finishItem = useCuecardSession((state) => state.actions.finishItem);

	// Memoized formatted time
	const formattedItemTime = useMemo(
		() => formatTimeWithLibrary(itemElapsedTime, "MM:SS"),
		[itemElapsedTime]
	);

	return {
		// Time values (formatted for display)
		formattedItemTime,

		// Raw values
		itemElapsedTime,

		// Controls (bound to store actions)
		startItem,
		finishItem,
	};
}

/**
 * Generic hook for timer controls that works with any timer store
 * Useful for UI components that need universal timer control access
 */
export function useTimerControls(storeType: "mcq" | "cuecard") {
	const mcqActions = useMcqSession((state) => state.actions);
	const cuecardActions = useCuecardSession((state) => state.actions);

	const actions = storeType === "mcq" ? mcqActions : cuecardActions;

	return useMemo(
		() => ({
			startTimer: actions.startTimer,
			pauseTimer: actions.pauseTimer,
			resumeTimer: actions.resumeTimer,
			resetTimer: actions.resetTimer,
			startItem: actions.startItem,
			finishItem: actions.finishItem,
		}),
		[actions]
	);
}

/**
 * Helper hook to determine which store type is currently active
 * Returns the active store type or null if no session is active
 */
export function useActiveTimerStore(): "mcq" | "cuecard" | null {
	const mcqStatus = useMcqSession((state) => state.status);
	const cuecardStatus = useCuecardSession((state) => state.status);

	if (mcqStatus === "active") return "mcq";
	if (cuecardStatus === "active") return "cuecard";
	return null;
}

/**
 * Universal timer hook that automatically determines which store to use
 * Based on which session is currently active
 */
export function useActiveSessionTimer(): SessionTimerHook | null {
	const activeStore = useActiveTimerStore();
	const mcqTimer = useMcqSessionTimer();
	const cuecardTimer = useCuecardSessionTimer();

	if (activeStore === "mcq") return mcqTimer;
	if (activeStore === "cuecard") return cuecardTimer;
	return null;
}

/**
 * Universal item timer hook that automatically determines which store to use
 */
export function useActiveItemTimer(): ItemTimerHook | null {
	const activeStore = useActiveTimerStore();
	const mcqItemTimer = useMcqItemTimer();
	const cuecardItemTimer = useCuecardItemTimer();

	if (activeStore === "mcq") return mcqItemTimer;
	if (activeStore === "cuecard") return cuecardItemTimer;
	return null;
}
