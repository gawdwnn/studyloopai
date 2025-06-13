export interface ErrorEvent {
  id: string;
  timestamp: Date;
  type:
    | "upload_error"
    | "network_error"
    | "processing_error"
    | "validation_error";
  message: string;
  details?: Record<string, unknown>;
  userId?: string;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
}

export interface ErrorSummary {
  totalErrors: number;
  errorsByType: Record<string, number>;
  recentErrors: ErrorEvent[];
  topErrors: Array<{ message: string; count: number }>;
}

class ErrorAnalytics {
  private errors: ErrorEvent[] = [];
  private maxStoredErrors = 100; // Keep last 100 errors in memory

  /**
   * Log an error event for analytics and monitoring
   * Includes context information for debugging
   */
  logError(
    type: ErrorEvent["type"],
    error: Error | string,
    details?: Record<string, unknown>
  ): void {
    const errorEvent: ErrorEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message: typeof error === "string" ? error : error.message,
      details,
      stackTrace: typeof error === "object" ? error.stack : undefined,
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };

    // Add to in-memory store
    this.errors.unshift(errorEvent);

    // Keep only recent errors to prevent memory leaks
    if (this.errors.length > this.maxStoredErrors) {
      this.errors = this.errors.slice(0, this.maxStoredErrors);
    }

    // Log to console for development
    console.error(`[ErrorAnalytics] ${type}:`, errorEvent);

    // TODO: In production, send to monitoring service
    // this.sendToMonitoringService(errorEvent);
  }

  /**
   * Get error summary for monitoring dashboard
   * Provides insights into error patterns
   */
  getErrorSummary(hoursBack = 24): ErrorSummary {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const recentErrors = this.errors.filter(
      (error) => error.timestamp > cutoffTime
    );

    const errorsByType = recentErrors.reduce(
      (acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const errorCounts = recentErrors.reduce(
      (acc, error) => {
        acc[error.message] = (acc[error.message] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));

    return {
      totalErrors: recentErrors.length,
      errorsByType,
      recentErrors: recentErrors.slice(0, 10),
      topErrors,
    };
  }

  /**
   * Clear stored errors (useful for testing)
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get all errors for debugging
   */
  getAllErrors(): ErrorEvent[] {
    return [...this.errors];
  }

  // TODO: Implement in production
  // private async sendToMonitoringService(error: ErrorEvent): Promise<void> {
  //   try {
  //     await fetch('/api/analytics/errors', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(error),
  //     });
  //   } catch (err) {
  //     console.warn('Failed to send error to monitoring service:', err);
  //   }
  // }
}

// Singleton instance for global error tracking
export const errorAnalytics = new ErrorAnalytics();

/**
 * Wrapper function to automatically log errors from async operations
 * Provides consistent error tracking across the application
 */
export async function withErrorTracking<T>(
  operation: () => Promise<T>,
  errorType: ErrorEvent["type"],
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    errorAnalytics.logError(errorType, error as Error, context);
    throw error; // Re-throw to maintain original behavior
  }
}
