// Session Manager Store Implementation
// Coordinates and manages multiple learning session types

import { differenceInMilliseconds, differenceInMinutes } from "date-fns";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type {
  ActiveSessionInfo,
  BaseSessionConfig,
  CrossSessionAnalytics,
  SessionHistoryEntry,
  SessionManagerStore,
  SessionRecommendation,
  SessionType,
} from "./types";
import { initialSessionManagerState } from "./types";

// Helper functions
function generateSessionId(type: SessionType): string {
  return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

async function generateSmartRecommendations(
  analytics: CrossSessionAnalytics
): Promise<SessionRecommendation[]> {
  // Simulate AI recommendation generation
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const recommendations: SessionRecommendation[] = [];

  // Recommend based on weak areas
  if (analytics.learningPatterns.weakestTopics.length > 0) {
    const weakestTopic = analytics.learningPatterns.weakestTopics[0];
    recommendations.push({
      type: "multiple-choice",
      reason: `Focus on ${weakestTopic} where you need improvement`,
      config: {
        courseId: "current", // Would be dynamically determined
        weeks: [], // Would be filtered by weak topic
        difficulty: "medium",
        focus: "weak-areas",
        practiceMode: "practice",
      },
      estimatedDuration: 15,
      priority: "high",
      benefits: [
        "Improve understanding",
        "Build confidence",
        "Fill knowledge gaps",
      ],
    });
  }

  // Recommend based on session type balance
  const sessionCounts = analytics.sessionTypeBreakdown;
  const totalSessions = Object.values(sessionCounts).reduce(
    (sum, type) => sum + type.count,
    0
  );

  if (totalSessions > 0) {
    const cuecardPercentage = sessionCounts.cuecards.count / totalSessions;
    const mcqPercentage =
      sessionCounts["multiple-choice"].count / totalSessions;
    const openQPercentage =
      sessionCounts["open-questions"].count / totalSessions;

    // Recommend underused session types
    if (cuecardPercentage < 0.3) {
      recommendations.push({
        type: "cuecards",
        reason: "Practice vocabulary and key concepts with spaced repetition",
        config: {
          courseId: "current",
          weeks: [],
          difficulty: "mixed",
          focus: "tailored-for-me",
          practiceMode: "practice",
        },
        estimatedDuration: 10,
        priority: "medium",
        benefits: [
          "Improve memory retention",
          "Quick review",
          "Strengthen fundamentals",
        ],
      });
    }

    if (mcqPercentage < 0.3) {
      recommendations.push({
        type: "multiple-choice",
        reason: "Test your knowledge with multiple choice questions.",
        config: {
          courseId: "current",
          weeks: [],
          difficulty: "medium",
          focus: "comprehensive",
          practiceMode: "exam",
        },
        estimatedDuration: 15,
        priority: "medium",
        benefits: [
          "Identify knowledge gaps",
          "Practice for exams",
          "Quick feedback",
        ],
      });
    }

    if (openQPercentage < 0.2) {
      recommendations.push({
        type: "open-questions",
        reason: "Develop deeper understanding through written explanations",
        config: {
          courseId: "current",
          weeks: [],
          difficulty: "medium",
          focus: "comprehensive",
          practiceMode: "practice",
        },
        estimatedDuration: 25,
        priority: "medium",
        benefits: [
          "Improve critical thinking",
          "Practice explanation skills",
          "Deepen understanding",
        ],
      });
    }
  }

  // Recommend based on time of day and productivity patterns
  const currentHour = new Date().getHours();
  const productiveHour = analytics.learningPatterns.mostProductiveTimeOfDay;

  if (Math.abs(currentHour - productiveHour) <= 2) {
    recommendations.push({
      type: "multiple-choice",
      reason:
        "This is your most productive time - tackle challenging questions!",
      config: {
        courseId: "current",
        weeks: [],
        difficulty: "hard",
        focus: "comprehensive",
        practiceMode: "practice",
      },
      estimatedDuration: 20,
      priority: "high",
      benefits: [
        "Maximize learning efficiency",
        "Challenge yourself",
        "Build expertise",
      ],
    });
  }

  return recommendations.slice(0, 3); // Return top 3 recommendations
}

const useSessionManager = create<SessionManagerStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialSessionManagerState,

        actions: {
          // Session coordination
          startSession: async (
            type: SessionType,
            config: BaseSessionConfig
          ) => {
            try {
              const sessionId = generateSessionId(type);
              const now = new Date();

              // End any existing active session first
              const currentActive = get().activeSession;
              if (currentActive) {
                await get().actions.endSession(currentActive.id, {
                  totalTime: differenceInMilliseconds(
                    new Date(),
                    currentActive.startedAt
                  ),
                  itemsCompleted: currentActive.progress.currentIndex,
                  accuracy: 0, // Would be calculated by the specific session store
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

              // Recalculate analytics
              await get().actions.calculateAnalytics();

              // Generate new recommendations
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

          switchSessionType: async (newType: SessionType) => {
            const state = get();
            const currentActive = state.activeSession;

            if (currentActive) {
              // End current session
              await get().actions.endSession(currentActive.id, {
                totalTime: Date.now() - currentActive.startedAt.getTime(),
                itemsCompleted: currentActive.progress.currentIndex,
                accuracy: 0,
              });
            }

            // Start new session
            await get().actions.startSession(newType, {
              courseId: "current",
              weeks: [],
              difficulty: "mixed",
              focus: "comprehensive",
              practiceMode: "practice",
            });
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
                  preferredDifficulty: "mixed",
                },
                "multiple-choice": {
                  count: 0,
                  averageAccuracy: 0,
                  averageScore: 0,
                  totalTime: 0,
                  preferredDifficulty: "mixed",
                },
                "open-questions": {
                  count: 0,
                  averageAccuracy: 0,
                  averageScore: 0,
                  totalTime: 0,
                  preferredDifficulty: "mixed",
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

          // Session Recovery
          recoverSession: async () => {
            try {
              const state = get();

              // Check if there's an active session that wasn't properly completed
              if (
                state.activeSession &&
                state.activeSession.status !== "completed"
              ) {
                // Session exists and is recoverable
                return state.activeSession;
              }

              // No recoverable session found
              return null;
            } catch (error) {
              set({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to recover session",
              });
              return null;
            }
          },

          // Synchronization
          syncWithServer: async () => {
            try {
              // TODO: Implement server synchronization
              // This will sync session history, analytics, and preferences
              const now = new Date();
              set({ lastSyncedAt: now });

              if (process.env.NODE_ENV === "development") {
                console.log("Session manager synced with server at", now);
              }
            } catch (error) {
              set({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to sync with server",
              });
            }
          },

          syncAllStores: async () => {
            try {
              // This will coordinate synchronization across all individual session stores
              await get().actions.syncWithServer();

              // TODO: Trigger sync on individual stores
              // Individual stores would implement their own sync methods

              if (process.env.NODE_ENV === "development") {
                console.log("All stores synchronized");
              }
            } catch (error) {
              set({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to sync all stores",
              });
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
      }),
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

// Helper functions for streak calculations
function calculateCurrentStreak(
  history: SessionHistoryEntry[],
  today: Date
): number {
  const sortedSessions = history
    .filter((session) => session.status === "completed")
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  let streak = 0;
  const currentDate = new Date(today);
  currentDate.setHours(0, 0, 0, 0);

  for (const session of sortedSessions) {
    const sessionDate = new Date(session.startedAt);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate.getTime() === currentDate.getTime()) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (sessionDate.getTime() < currentDate.getTime()) {
      break;
    }
  }

  return streak;
}

function calculateLongestStreak(history: SessionHistoryEntry[]): number {
  const completedSessions = history
    .filter((session) => session.status === "completed")
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  if (completedSessions.length === 0) return 0;

  let longestStreak = 0;
  let currentStreak = 1;
  let lastDate = new Date(completedSessions[0].startedAt);
  lastDate.setHours(0, 0, 0, 0);

  for (let i = 1; i < completedSessions.length; i++) {
    const sessionDate = new Date(completedSessions[i].startedAt);
    sessionDate.setHours(0, 0, 0, 0);

    const dayDifference =
      (sessionDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

    if (dayDifference === 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }

    lastDate = sessionDate;
  }

  return Math.max(longestStreak, currentStreak);
}

function calculateWeeklyProgress(
  history: SessionHistoryEntry[],
  today: Date,
  dailyGoal: number
): number {
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekSessions = history.filter(
    (session) =>
      session.startedAt >= weekStart &&
      session.startedAt <= weekEnd &&
      session.status === "completed"
  );

  const targetSessions = dailyGoal * 7;
  return targetSessions > 0
    ? Math.min((weekSessions.length / targetSessions) * 100, 100)
    : 0;
}

export { useSessionManager };
export type { SessionManagerStore };
