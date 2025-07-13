"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCuecardSession } from "@/lib/stores/cuecard-session/use-cuecard-session";
import { useMcqSession } from "@/lib/stores/mcq-session/use-mcq-session";
import { useOpenQuestionSession } from "@/lib/stores/open-question-session/use-open-question-session";
import type { SessionType } from "@/lib/stores/session-manager/types";
import { useSessionManager } from "@/lib/stores/session-manager/use-session-manager";
import { Clock, Pause, Play, Target, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "../ui/skeleton";

// Define a unified progress shape
interface UnifiedSessionDetails {
  isLoading: boolean;
  sessionType: SessionType | null;
  progress: {
    currentIndex: number;
    totalItems: number;
    correctCount: number;
    incorrectCount: number;
    accuracy: number; // Percentage
    startedAt: Date | null;
  };
  config: {
    difficulty: string;
    focus: string;
    mode: string;
  } | null;
}

function useActiveSessionDetails() {
  const activeSessionInfo = useSessionManager((s) => s.activeSession);
  const mcqSession = useMcqSession();
  const cuecardSession = useCuecardSession();
  const openQuestionSession = useOpenQuestionSession();

  const details = useMemo((): UnifiedSessionDetails => {
    if (!activeSessionInfo) {
      return {
        isLoading: false,
        sessionType: null,
        progress: {
          currentIndex: 0,
          totalItems: 0,
          correctCount: 0,
          incorrectCount: 0,
          accuracy: 0,
          startedAt: null,
        },
        config: null,
      };
    }

    switch (activeSessionInfo.type) {
      case "multiple-choice": {
        const { progress, config, isLoading } = mcqSession;
        const totalAnswered =
          progress.correctAnswers + progress.incorrectAnswers;
        return {
          isLoading,
          sessionType: "multiple-choice",
          progress: {
            currentIndex: progress.currentIndex,
            totalItems: progress.totalQuestions,
            correctCount: progress.correctAnswers,
            incorrectCount: progress.incorrectAnswers,
            accuracy:
              totalAnswered > 0
                ? Math.round((progress.correctAnswers / totalAnswered) * 100)
                : 0,
            startedAt: progress.startedAt,
          },
          config: {
            difficulty: config.difficulty,
            focus: config.focus,
            mode: config.practiceMode,
          },
        };
      }
      case "cuecards": {
        const { progress, config, isLoading } = cuecardSession;
        const totalAnswered =
          progress.correctAnswers + progress.incorrectAnswers;
        return {
          isLoading,
          sessionType: "cuecards",
          progress: {
            currentIndex: progress.currentIndex,
            totalItems: progress.totalCards,
            correctCount: progress.correctAnswers,
            incorrectCount: progress.incorrectAnswers,
            accuracy:
              totalAnswered > 0
                ? Math.round((progress.correctAnswers / totalAnswered) * 100)
                : 0,
            startedAt: progress.startedAt,
          },
          config: {
            difficulty: String(config.difficulty),
            focus: config.focus,
            mode: "Practice",
          },
        };
      }
      case "open-questions": {
        const { progress, config, isLoading } = openQuestionSession;
        const correctCount =
          progress.answers.filter(
            (a) => a.evaluationStatus === "completed" && (a.aiScore ?? 0) > 0.7
          ).length ?? 0;
        const incorrectCount =
          progress.answers.filter(
            (a) => a.evaluationStatus === "completed" && (a.aiScore ?? 0) <= 0.7
          ).length ?? 0;
        return {
          isLoading,
          sessionType: "open-questions",
          progress: {
            currentIndex: progress.currentIndex,
            totalItems: progress.totalQuestions,
            correctCount,
            incorrectCount,
            accuracy:
              progress.answeredQuestions > 0
                ? Math.round(progress.averageScore * 100)
                : 0,
            startedAt: progress.startedAt,
          },
          config: {
            difficulty: config.difficulty,
            focus: config.focus,
            mode: "Practice",
          },
        };
      }
      default:
        return {
          isLoading: false,
          sessionType: null,
          progress: {
            currentIndex: 0,
            totalItems: 0,
            correctCount: 0,
            incorrectCount: 0,
            accuracy: 0,
            startedAt: null,
          },
          config: null,
        };
    }
  }, [activeSessionInfo, mcqSession, cuecardSession, openQuestionSession]);

  return details;
}

/**
 * Real-time session progress indicator that shows current session state,
 * progress, and provides session controls.
 */
export function SessionProgressIndicator() {
  const activeSessionInfo = useSessionManager((s) => s.activeSession);
  const { pauseSession, resumeSession } = useSessionManager((s) => s.actions);
  const { isLoading, progress, config, sessionType } =
    useActiveSessionDetails();
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    if (
      !activeSessionInfo ||
      activeSessionInfo.status !== "active" ||
      !progress.startedAt
    ) {
      return;
    }

    const startedAt = progress.startedAt;
    const timer = setInterval(() => {
      setTimeSpent(Date.now() - startedAt.getTime());
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSessionInfo, progress.startedAt]);

  if (!activeSessionInfo) return null;

  if (isLoading) {
    return <SessionProgressIndicatorSkeleton />;
  }

  const getProgressPercentage = () => {
    if (progress.totalItems === 0) return 0;
    return (progress.currentIndex / progress.totalItems) * 100;
  };

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getSessionTypeLabel = () => {
    switch (sessionType) {
      case "cuecards":
        return "Cuecards";
      case "multiple-choice":
        return "Multiple Choice";
      case "open-questions":
        return "Open Questions";
      default:
        return "Learning Session";
    }
  };

  const getStatusColor = () => {
    switch (activeSessionInfo.status) {
      case "active":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "completed":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <h3 className="font-semibold">{getSessionTypeLabel()}</h3>
          <Badge variant="secondary" className="capitalize">
            {activeSessionInfo.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {activeSessionInfo.status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pauseSession(activeSessionInfo.id)}
              className="h-8 w-8 p-0"
            >
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {activeSessionInfo.status === "paused" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resumeSession(activeSessionInfo.id)}
              className="h-8 w-8 p-0"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {progress.currentIndex} / {progress.totalItems}
          </span>
        </div>
        <Progress value={getProgressPercentage()} className="h-2" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{formatTime(timeSpent)}</div>
            <div className="text-muted-foreground text-xs">Time</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Target className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{progress.accuracy}%</div>
            <div className="text-muted-foreground text-xs">Accuracy</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{progress.correctCount}</div>
            <div className="text-muted-foreground text-xs">Correct</div>
          </div>
        </div>
      </div>

      {config && (
        <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
          <div>Difficulty: {config.difficulty}</div>
          <div>Focus: {config.focus}</div>
          <div>Mode: {config.mode}</div>
        </div>
      )}
    </div>
  );
}

function SessionProgressIndicatorSkeleton() {
  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-2 w-full" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: This is a static skeleton and will not be re-ordered.
          <div key={i} className="flex items-center gap-2 text-sm">
            <Skeleton className="h-4 w-4" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t space-y-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
