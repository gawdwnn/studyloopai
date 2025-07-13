"use client";

import type {
  CrossSessionAnalytics,
  SessionHistoryEntry,
  SessionManagerState,
} from "@/lib/stores/session-manager/types";
import { useSessionManager } from "@/lib/stores/session-manager/use-session-manager";
import { useEffect } from "react";

interface SessionInitializerProps {
  initialState?: {
    history?: SessionHistoryEntry[];
    analytics?: CrossSessionAnalytics;
    preferences?: SessionManagerState["preferences"];
  };
  children: React.ReactNode;
}

/**
 * SessionInitializer component for hydrating the session manager store with server-fetched data.
 */
export function SessionInitializer({
  initialState,
  children,
}: SessionInitializerProps) {
  const { hydrate } = useSessionManager((s) => s.actions);

  useEffect(() => {
    if (initialState) {
      hydrate(initialState);
    }

    // Log initialization for debugging in development
    if (process.env.NODE_ENV === "development") {
      // biome-ignore lint/suspicious/noConsoleLog: Debug logging for development
      console.log("Session manager store initialized with server data");
    }
  }, [initialState, hydrate]);

  return <>{children}</>;
}
