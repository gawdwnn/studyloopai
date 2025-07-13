"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { SessionType } from "@/lib/stores/session-manager/types";
import { useSessionManager } from "@/lib/stores/session-manager/use-session-manager";
import { Clock, RotateCcw } from "lucide-react";
import { useState } from "react";

interface SessionRecoveryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRecover: () => void;
  onStartNew: () => void;
}

/**
 * Dialog for session recovery when a user returns with an incomplete session.
 * Provides clear options to continue or start fresh.
 */
export function SessionRecoveryDialog({
  isOpen,
  onOpenChange,
  onRecover,
  onStartNew,
}: SessionRecoveryDialogProps) {
  const sessionManager = useSessionManager();
  const sessionToRecover = sessionManager.activeSession;
  const [isRecovering, setIsRecovering] = useState(false);

  if (!sessionToRecover) return null;

  const handleRecover = async () => {
    setIsRecovering(true);
    await onRecover();
    setIsRecovering(false);
    onOpenChange(false);
  };

  const handleStartNew = () => {
    onStartNew();
    onOpenChange(false);
  };

  const getSessionTypeLabel = (type: SessionType) => {
    switch (type) {
      case "cuecards":
        return "Cuecard";
      case "multiple-choice":
        return "Multiple Choice";
      case "open-questions":
        return "Open Questions";
      default:
        return "Learning";
    }
  };

  const formatTimeSpent = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getProgressPercentage = () => {
    if (sessionToRecover.progress.totalItems === 0) return 0;
    return Math.round(
      (sessionToRecover.progress.currentIndex /
        sessionToRecover.progress.totalItems) *
        100
    );
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <RotateCcw className="h-5 w-5 text-primary" />
            </div>
            <AlertDialogTitle className="text-left">
              Continue Previous Session?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              You have an incomplete{" "}
              {getSessionTypeLabel(sessionToRecover.type).toLowerCase()} session
              that you can continue.
            </p>

            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {sessionToRecover.progress.currentIndex} /{" "}
                  {sessionToRecover.progress.totalItems}(
                  {getProgressPercentage()}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Time spent
                </span>
                <span className="font-medium">
                  {formatTimeSpent(0)}{" "}
                  {/* TODO: Add timeSpent to session manager progress */}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="font-medium">
                  0% {/* TODO: Add accuracy calculation to session manager */}
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleStartNew}>
              Start New Session
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={handleRecover}
              disabled={isRecovering}
              className="bg-primary hover:bg-primary/90"
            >
              {isRecovering ? "Recovering..." : "Continue Session"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
