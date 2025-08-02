// Session Manager Store Implementation
// Coordinates and manages multiple learning session types

import { differenceInMinutes } from "date-fns";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { persist } from "zustand/middleware";
import {
	calculateCurrentStreak,
	calculateLongestStreak,
	calculateWeeklyProgress,
	generateSmartRecommendations,
} from "./session-manager-utils";
import type {
	ActiveSessionInfo,
	BaseSessionConfig,
	CrossSessionAnalytics,
	SessionCallbacks,
	SessionHistoryEntry,
	SessionManagerStore,
	SessionType,
} from "./types";
import { initialSessionManagerState } from "./types";

function generateSessionId(type: SessionType): string {
	return `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function calculateSessionLength(startedAt: Date, completedAt: Date): number {
	return differenceInMinutes(completedAt, startedAt);
}

function getTimeOfDay(date: Date): number {
	return date.getHours();
}

function calculateCompletionPercentage(
	currentIndex: number,
	totalItems: number
): number {
	return totalItems > 0 ? Math.round((currentIndex / totalItems) * 100) : 0;
}

const useSessionManager = create<SessionManagerStore>()(
	subscribeWithSelector(
		persist(
			(set, get) => {
				// Callback registry for child stores
				const sessionCallbacks = new Map<SessionType, SessionCallbacks>();

				return {
					...initialSessionManagerState,

					actions: {
						// Callback registration API
						registerSessionCallbacks: (
							sessionType: SessionType,
							callbacks: SessionCallbacks
						) => {
							sessionCallbacks.set(sessionType, callbacks);
							// Return unregister function for cleanup
							return () => {
								sessionCallbacks.delete(sessionType);
							};
						},

						// Session coordination
						startSession: async (
							type: SessionType,
							config: BaseSessionConfig
						) => {
							try {
								const sessionId = generateSessionId(type);
								const now = new Date();

								// End any existing active session
								const currentActive = get().activeSession;
								if (currentActive) {
									await get().actions.endSession(currentActive.id, {
										totalTime: Date.now() - currentActive.startedAt.getTime(),
										itemsCompleted: currentActive.progress.currentIndex,
										accuracy: 0,
									});
								}

								// Create new active session info
								const activeSession: ActiveSessionInfo = {
									id: sessionId,
									type,
									config,
									startedAt: now,
									lastActivityAt: now,
									status: "active",
									progress: {
										currentIndex: 0,
										totalItems: 0, // Will be updated by session stores
										completionPercentage: 0,
									},
								};

								set({ activeSession });

								// Notify registered callback for this session type
								const callbacks = sessionCallbacks.get(type);
								if (callbacks?.onStart) {
									try {
										callbacks.onStart(sessionId, config);
									} catch (error) {
										console.warn(
											`Session Manager: onStart callback failed for ${type}:`,
											error
										);
									}
								}

								return sessionId;
							} catch (error) {
								set({
									error:
										error instanceof Error
											? error.message
											: "Failed to start session",
								});
								throw error;
							}
						},

						endSession: async (
							sessionId: string,
							finalStats: SessionHistoryEntry["finalStats"]
						) => {
							const state = get();
							const activeSession = state.activeSession;

							if (!activeSession || activeSession.id !== sessionId) {
								return;
							}

							try {
								const now = new Date();

								// Create session history entry
								const historyEntry: SessionHistoryEntry = {
									id: sessionId,
									type: activeSession.type,
									courseId: activeSession.config.courseId, // Would be from session config
									startedAt: activeSession.startedAt,
									completedAt: now,
									status: "completed",
									config: activeSession.config,
									finalStats,
									performance: {
										strengths: [], // Would be calculated based on session results
										weaknesses: [],
										recommendations: [],
									},
								};

								// Update state
								set((prevState) => ({
									activeSession: null,
									sessionHistory: [historyEntry, ...prevState.sessionHistory],
									lastSyncedAt: now,
								}));

								// Notify registered callback for this session type
								const callbacks = sessionCallbacks.get(activeSession.type);
								if (callbacks?.onEnd) {
									try {
										callbacks.onEnd(sessionId, finalStats);
									} catch (error) {
										console.warn(
											`Session Manager: onEnd callback failed for ${activeSession.type}:`,
											error
										);
									}
								}

								await get().actions.calculateAnalytics();
								await get().actions.generateRecommendations();
							} catch (error) {
								set({
									error:
										error instanceof Error
											? error.message
											: "Failed to end session",
								});
							}
						},

						pauseSession: (sessionId: string) => {
							const state = get();
							if (state.activeSession?.id === sessionId) {
								set({
									activeSession: {
										...state.activeSession,
										status: "paused",
										lastActivityAt: new Date(),
									},
								});
							}
						},

						resumeSession: (sessionId: string) => {
							const state = get();
							if (state.activeSession?.id === sessionId) {
								set({
									activeSession: {
										...state.activeSession,
										status: "active",
										lastActivityAt: new Date(),
									},
								});
							}
						},

						// Session history
						getSessionHistory: (filter) => {
							const state = get();
							let history = state.sessionHistory;

							if (filter?.type) {
								history = history.filter(
									(session) => session.type === filter.type
								);
							}

							if (filter?.dateRange) {
								const { start, end } = filter.dateRange;
								history = history.filter(
									(session) =>
										session.startedAt >= start && session.startedAt <= end
								);
							}

							return history;
						},

						getSessionById: (sessionId: string) => {
							const state = get();
							return (
								state.sessionHistory.find(
									(session) => session.id === sessionId
								) || null
							);
						},

						deleteSession: (sessionId: string) => {
							set((prevState) => ({
								sessionHistory: prevState.sessionHistory.filter(
									(session) => session.id !== sessionId
								),
							}));
						},

						// Analytics
						calculateAnalytics: async () => {
							try {
								set({ isLoadingAnalytics: true });

								const state = get();
								const history = state.sessionHistory;

								if (history.length === 0) {
									set({
										analytics: {
											...state.analytics,
											totalSessions: 0,
											totalTimeSpent: 0,
											averageSessionLength: 0,
										},
										isLoadingAnalytics: false,
									});
									return state.analytics;
								}

								// Calculate basic metrics
								const totalSessions = history.length;
								const totalTimeSpent = history.reduce(
									(sum, session) => sum + session.finalStats.totalTime,
									0
								);
								const averageSessionLength =
									totalTimeSpent / totalSessions / (1000 * 60); // minutes

								// Session type breakdown
								const sessionTypeBreakdown = {
									cuecards: {
										count: 0,
										averageAccuracy: 0,
										averageScore: 0,
										totalTime: 0,
									},
									"multiple-choice": {
										count: 0,
										averageAccuracy: 0,
										averageScore: 0,
										totalTime: 0,
									},
									"open-questions": {
										count: 0,
										averageAccuracy: 0,
										averageScore: 0,
										totalTime: 0,
									},
									mcqs: {
										count: 0,
										averageAccuracy: 0,
										averageScore: 0,
										totalTime: 0,
									},
								};

								for (const session of history) {
									const type = session.type;
									sessionTypeBreakdown[type].count++;
									sessionTypeBreakdown[type].averageAccuracy +=
										session.finalStats.accuracy;
									sessionTypeBreakdown[type].averageScore +=
										session.finalStats.score || 0;
									sessionTypeBreakdown[type].totalTime +=
										session.finalStats.totalTime;
								}

								// Calculate averages
								for (const key of Object.keys(sessionTypeBreakdown)) {
									const type = key as SessionType;
									const data = sessionTypeBreakdown[type];
									if (data.count > 0) {
										data.averageAccuracy /= data.count;
										data.averageScore /= data.count;
									}
								}

								// Learning patterns
								const sessionTimes = history.map((session) =>
									getTimeOfDay(session.startedAt)
								);
								const timeFrequency = sessionTimes.reduce(
									(acc, time) => {
										acc[time] = (acc[time] || 0) + 1;
										return acc;
									},
									{} as Record<number, number>
								);

								const mostProductiveTimeOfDay = Object.entries(
									timeFrequency
								).sort(([, a], [, b]) => b - a)[0]?.[0];

								const sessionLengths = history
									.filter((session) => session.completedAt)
									.map((session) =>
										calculateSessionLength(
											session.startedAt,
											session.completedAt as Date
										)
									);
								const preferredSessionLength =
									sessionLengths.reduce((sum, length) => sum + length, 0) /
									sessionLengths.length;

								// Calculate improvement trend (simple linear regression on accuracy)
								const accuracies = history.map((session, index) => ({
									x: index,
									y: session.finalStats.accuracy,
								}));
								let improvementTrend = 0;

								if (accuracies.length > 1) {
									const n = accuracies.length;
									const sumX = accuracies.reduce(
										(sum, point) => sum + point.x,
										0
									);
									const sumY = accuracies.reduce(
										(sum, point) => sum + point.y,
										0
									);
									const sumXY = accuracies.reduce(
										(sum, point) => sum + point.x * point.y,
										0
									);
									const sumXX = accuracies.reduce(
										(sum, point) => sum + point.x * point.x,
										0
									);

									improvementTrend =
										(n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
								}

								// Goals and streaks
								const today = new Date();
								const currentStreak = calculateCurrentStreak(history, today);
								const longestStreak = calculateLongestStreak(history);
								const weeklyProgress = calculateWeeklyProgress(
									history,
									today,
									state.preferences.reminderSettings.dailyGoal
								);

								const analytics: CrossSessionAnalytics = {
									totalSessions,
									totalTimeSpent,
									averageSessionLength,
									sessionTypeBreakdown,
									learningPatterns: {
										mostProductiveTimeOfDay:
											Number.parseInt(mostProductiveTimeOfDay) || 14,
										preferredSessionLength:
											Math.round(preferredSessionLength) || 20,
										strongestTopics: [], // Would be calculated from session results
										weakestTopics: [], // Would be calculated from session results
										improvementTrend,
									},
									goals: {
										dailySessionTarget:
											state.preferences.reminderSettings.dailyGoal,
										currentStreak,
										longestStreak,
										weeklyProgress,
									},
								};

								set({
									analytics,
									isLoadingAnalytics: false,
								});

								return analytics;
							} catch (error) {
								set({
									error:
										error instanceof Error
											? error.message
											: "Failed to calculate analytics",
									isLoadingAnalytics: false,
								});
								throw error;
							}
						},

						// Recommendations
						generateRecommendations: async () => {
							try {
								set({ isGeneratingRecommendations: true });

								const state = get();
								const recommendations = await generateSmartRecommendations(
									state.analytics
								);

								set({
									recommendations,
									isGeneratingRecommendations: false,
								});

								return recommendations;
							} catch (error) {
								set({
									error:
										error instanceof Error
											? error.message
											: "Failed to generate recommendations",
									isGeneratingRecommendations: false,
								});
								return [];
							}
						},

						// Preferences
						updatePreferences: (preferences) => {
							set((prevState) => ({
								preferences: {
									...prevState.preferences,
									...preferences,
								},
							}));
						},

						getPreferences: () => {
							return get().preferences;
						},

						// Progress tracking
						updateSessionProgress: (sessionId: string, progress) => {
							const state = get();
							if (state.activeSession?.id === sessionId) {
								set({
									activeSession: {
										...state.activeSession,
										progress: {
											...progress,
											completionPercentage: calculateCompletionPercentage(
												progress.currentIndex,
												progress.totalItems
											),
										},
										lastActivityAt: new Date(),
									},
								});

								// Notify registered callback for progress updates
								const callbacks = sessionCallbacks.get(
									state.activeSession.type
								);
								if (callbacks?.onProgress) {
									try {
										callbacks.onProgress(sessionId, progress);
									} catch (error) {
										console.warn(
											`Session Manager: onProgress callback failed for ${state.activeSession.type}:`,
											error
										);
									}
								}
							}
						},

						getActiveSessionInfo: () => {
							return get().activeSession;
						},

						// Goal management
						setDailyGoal: (sessions: number) => {
							set((prevState) => ({
								preferences: {
									...prevState.preferences,
									reminderSettings: {
										...prevState.preferences.reminderSettings,
										dailyGoal: sessions,
									},
								},
							}));
						},

						checkGoalProgress: () => {
							const state = get();
							const today = new Date();
							const todayStr = today.toDateString();

							const todaySessions = state.sessionHistory.filter(
								(session) =>
									session.startedAt.toDateString() === todayStr &&
									session.status === "completed"
							);

							const completed = todaySessions.length;
							const target = state.preferences.reminderSettings.dailyGoal;
							const percentage =
								target > 0 ? Math.min((completed / target) * 100, 100) : 0;

							return { completed, target, percentage };
						},

						// Error handling
						setError: (error: string | null) => {
							set({ error });
						},

						clearError: () => {
							set({ error: null });
						},

						hydrate: (initialState) => {
							set((state) => ({
								sessionHistory: initialState.history ?? state.sessionHistory,
								analytics: initialState.analytics ?? state.analytics,
								preferences: initialState.preferences ?? state.preferences,
								lastSyncedAt: new Date(),
							}));
						},
					},
				};
			},
			{
				name: "session-manager-store",
				version: 1,
				partialize: (state) => ({
					sessionHistory: state.sessionHistory,
					analytics: state.analytics,
					preferences: state.preferences,
					lastSyncedAt: state.lastSyncedAt,
				}),
			}
		)
	)
);

export { useSessionManager };
export type { SessionManagerStore };
