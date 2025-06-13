export interface QueuedOperation {
  id: string;
  type: "upload" | "api_call" | "content_generation";
  operation: () => Promise<unknown>;
  data: unknown;
  timestamp: Date;
  retries: number;
  maxRetries: number;
  resolve?: (value: unknown) => void;
  reject?: (error: unknown) => void;
}

export interface OfflineStatus {
  isOffline: boolean;
  lastOnline: Date | null;
  queuedOperations: number;
}

class OfflineHandler {
  private isOffline = false;
  private queue: QueuedOperation[] = [];
  private listeners: Array<(status: OfflineStatus) => void> = [];
  private lastOnline: Date | null = null;
  private processingQueue = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.initializeOfflineDetection();
    }
  }

  /**
   * Initialize browser offline/online detection
   * Sets up event listeners for connectivity changes
   */
  private initializeOfflineDetection(): void {
    this.isOffline = !navigator.onLine;
    this.lastOnline = navigator.onLine ? new Date() : null;

    // Listen for online/offline events
    window.addEventListener("online", this.handleOnline.bind(this));
    window.addEventListener("offline", this.handleOffline.bind(this));

    // Additional connectivity checks using fetch
    setInterval(() => {
      this.checkConnectivity();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Enhanced connectivity check using actual network request
   * More reliable than navigator.onLine
   */
  private async checkConnectivity(): Promise<void> {
    try {
      // Use a lightweight endpoint or create a health check
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-cache",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok && this.isOffline) {
        this.handleOnline();
      }
    } catch {
      if (!this.isOffline) {
        this.handleOffline();
      }
    }
  }

  /**
   * Handle online event - process queued operations
   */
  private handleOnline(): void {
    console.log("Connection restored - processing queued operations");
    this.isOffline = false;
    this.lastOnline = new Date();
    this.notifyListeners();
    this.processQueue();
  }

  /**
   * Handle offline event - start queuing operations
   */
  private handleOffline(): void {
    console.log("Connection lost - operations will be queued");
    this.isOffline = true;
    this.notifyListeners();
  }

  /**
   * Add operation to queue when offline
   * Returns immediately with promise that resolves when operation completes
   */
  queueOperation<T>(
    type: QueuedOperation["type"],
    operation: () => Promise<T>,
    data?: unknown,
    maxRetries = 3
  ): Promise<T> {
    const queuedOp: QueuedOperation = {
      id: crypto.randomUUID(),
      type,
      operation: operation as () => Promise<unknown>,
      data,
      timestamp: new Date(),
      retries: 0,
      maxRetries,
    };

    this.queue.push(queuedOp);
    const queueLength = this.queue.length;
    console.log(`Operation queued: ${type} (${queueLength} in queue)`);
    this.notifyListeners();

    // Return a promise that resolves when the operation is processed
    return new Promise<T>((resolve, reject) => {
      // Store resolve/reject with the operation
      queuedOp.resolve = resolve as (value: unknown) => void;
      queuedOp.reject = reject;
    });
  }

  /**
   * Process all queued operations when back online
   * Handles retries and error recovery
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.queue.length === 0) {
      return;
    }

    this.processingQueue = true;
    const queueLength = this.queue.length;
    console.log(`Processing ${queueLength} queued operations`);

    // Process operations in order
    while (this.queue.length > 0 && !this.isOffline) {
      const operation = this.queue.shift();
      if (!operation) continue;

      try {
        console.log(`Processing queued ${operation.type} operation`);
        const result = await operation.operation();

        // Resolve the original promise
        if (operation.resolve) {
          operation.resolve(result);
        }
      } catch (error) {
        console.warn("Queued operation failed:", error);
        operation.retries++;

        // Retry if under max retries
        if (operation.retries < operation.maxRetries) {
          const retryInfo = `${operation.retries}/${operation.maxRetries}`;
          console.log(`Retrying operation (${retryInfo})`);
          this.queue.unshift(operation); // Put back at front
        } else {
          const maxRetries = operation.maxRetries;
          console.error(`Operation failed after ${maxRetries} retries`);

          // Reject the original promise
          if (operation.reject) {
            operation.reject(error);
          }
        }
      }

      // Small delay between operations to prevent overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.processingQueue = false;
    this.notifyListeners();
    console.log("Queue processing completed");
  }

  /**
   * Execute operation with offline awareness
   * Automatically queues when offline, executes immediately when online
   */
  async executeWithOfflineSupport<T>(
    type: QueuedOperation["type"],
    operation: () => Promise<T>,
    data?: unknown
  ): Promise<T> {
    if (this.isOffline) {
      return this.queueOperation(type, operation, data);
    }

    try {
      return await operation();
    } catch (error) {
      // If operation fails and we detect we're offline, queue it
      if (this.isOffline) {
        return this.queueOperation(type, operation, data);
      }
      throw error;
    }
  }

  /**
   * Get current offline status
   */
  getStatus(): OfflineStatus {
    return {
      isOffline: this.isOffline,
      lastOnline: this.lastOnline,
      queuedOperations: this.queue.length,
    };
  }

  /**
   * Subscribe to offline status changes
   */
  subscribe(listener: (status: OfflineStatus) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of status changes
   */
  private notifyListeners(): void {
    const status = this.getStatus();
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (error) {
        console.error("Error in offline status listener:", error);
      }
    }
  }

  /**
   * Clear all queued operations (useful for testing)
   */
  clearQueue(): void {
    this.queue = [];
    this.notifyListeners();
  }
}

// Singleton instance for global offline handling
export const offlineHandler = new OfflineHandler();
