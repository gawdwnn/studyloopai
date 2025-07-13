"use client";

import { SessionProgressIndicator } from "@/components/session";
import type { McqConfig } from "@/lib/stores/mcq-session/types";
import { useMcqSession } from "@/lib/stores/mcq-session/use-mcq-session";
import { useSessionManager } from "@/lib/stores/session-manager/use-session-manager";
import { differenceInMinutes } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SessionRecoveryDialog } from "../session/session-recovery-dialog";
import { McqQuizView } from "./mcq-quiz-view";
import { McqResultsView } from "./mcq-results-view";
import { McqSessionSetup } from "./mcq-session-setup";

type Course = {
  id: string;
  name: string;
  description: string | null;
};

interface McqSessionManagerProps {
  courses: Course[];
}

export function McqSessionManager({ courses }: McqSessionManagerProps) {
  const sessionManager = useSessionManager((s) => s);
  const mcqSession = useMcqSession((s) => s);
  const {
    startSession: startMcqSession,
    resetSession: resetMcqSession,
    submitAnswer,
    moveToNextQuestion,
  } = mcqSession.actions;
  const {
    startSession: startManagerSession,
    endSession: endManagerSession,
    recoverSession,
  } = sessionManager.actions;

  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [hasCheckedRecovery, setHasCheckedRecovery] = useState(false);

  useEffect(() => {
    if (!hasCheckedRecovery) {
      const check = async () => {
        const recoverable = await recoverSession();
        if (recoverable && recoverable.type === "multiple-choice") {
          setShowRecoveryDialog(true);
        }
        setHasCheckedRecovery(true);
      };
      check();
    }
  }, [hasCheckedRecovery, recoverSession]);

  const handleStartSession = async (config: McqConfig) => {
    try {
      await startManagerSession("multiple-choice", config);
      await startMcqSession(config);
      toast.success("MCQ session started!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to start session. Please try again.");
    }
  };

  const handleQuestionAnswer = (
    questionId: string,
    selectedAnswer: string | null,
    timeSpent: number
  ) => {
    if (mcqSession.status !== "active") return;
    submitAnswer(questionId, selectedAnswer, timeSpent);
    // The store now handles correctness check, but moving to next is a UI concern here
    if (
      mcqSession.progress.currentIndex <
      mcqSession.progress.totalQuestions - 1
    ) {
      setTimeout(() => moveToNextQuestion(), 1000); // give user time to see feedback
    } else {
      setTimeout(() => mcqSession.actions.endSession(), 1000);
      toast.success("MCQ session completed!");
    }
  };

  const handleEndSession = async () => {
    if (sessionManager.activeSession) {
      const finalStats = {
        totalTime:
          Date.now() - sessionManager.activeSession.startedAt.getTime(),
        itemsCompleted: mcqSession.progress.currentIndex + 1,
        accuracy: mcqSession.performance.accuracy,
      };
      await endManagerSession(sessionManager.activeSession.id, finalStats);
    }
    resetMcqSession();
  };

  const handleRecover = () => {
    setShowRecoveryDialog(false);
    toast.success("Your session has been successfully recovered.");
  };

  const handleStartNew = () => {
    handleEndSession();
    setShowRecoveryDialog(false);
  };

  if (showRecoveryDialog) {
    return (
      <SessionRecoveryDialog
        isOpen={showRecoveryDialog}
        onOpenChange={setShowRecoveryDialog}
        onRecover={handleRecover}
        onStartNew={handleStartNew}
      />
    );
  }

  if (mcqSession.status === "idle" || mcqSession.status === "failed") {
    return (
      <McqSessionSetup
        courses={courses}
        onStartSession={handleStartSession}
        onClose={() => {
          /* no-op */
        }}
      />
    );
  }

  if (mcqSession.status === "active" && mcqSession.questions.length > 0) {
    return (
      <div className="relative flex h-full flex-1 flex-col">
        {process.env.NODE_ENV === "development" && <SessionProgressIndicator />}
        <div className="flex-1 overflow-y-auto">
          <McqQuizView
            questions={mcqSession.questions}
            config={mcqSession.config}
            onQuestionAnswer={handleQuestionAnswer}
            onEndSession={handleEndSession}
            onClose={handleEndSession}
          />
        </div>
      </div>
    );
  }

  if (mcqSession.status === "completed") {
    const { progress, questions } = mcqSession;
    const sessionTime = sessionManager.activeSession
      ? differenceInMinutes(new Date(), sessionManager.activeSession.startedAt)
      : 0;
    const totalAnswered = progress.correctAnswers + progress.incorrectAnswers;
    const avgTime =
      totalAnswered > 0 ? progress.timeSpent / totalAnswered / 1000 : 0;

    const resultsData = {
      score: mcqSession.performance.accuracy,
      skipped: progress.skippedQuestions,
      totalTime: sessionTime < 1 ? "< 1 min" : `${sessionTime} min`,
      timeOnExercise: `${Math.round(avgTime)} sec`,
      avgPerExercise: `${Math.round(avgTime)} sec`,
      questions: questions.map((q) => {
        const answer = progress.answers.find((a) => a.questionId === q.id);
        return {
          question: q.question,
          time: answer ? `${Math.round(answer.timeSpent / 1000)}s` : "0s",
          correct: answer?.isCorrect ?? false,
          userAnswer: answer?.selectedAnswer ?? null,
          correctAnswer: q.correctAnswer,
          options: q.options,
          explanation: q.explanation,
        };
      }),
    };

    return (
      <McqResultsView results={resultsData} onRestart={handleEndSession} />
    );
  }

  return null;
}
