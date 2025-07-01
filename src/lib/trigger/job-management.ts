"use server";

import { runs } from "@trigger.dev/sdk/v3";

/**
 * Attempts to cancel a running Trigger.dev job
 * @param runId - The run ID to cancel
 * @returns Promise with cancellation result
 */
export async function cancelTriggerRun(runId: string) {
	try {
		// Check if the run is still active
		const run = await runs.retrieve(runId);

		if (!run) {
			return {
				success: false,
				error: "Run not found",
				canCancel: false,
			};
		}

		// Check if run is in a cancellable state
		const cancellableStates = ["QUEUED", "EXECUTING", "WAITING_FOR_DEPLOY"];
		const canCancel = cancellableStates.includes(run.status);

		if (!canCancel) {
			return {
				success: false,
				error: `Run is in ${run.status} state and cannot be cancelled`,
				canCancel: false,
				status: run.status,
			};
		}

		// Attempt to cancel the run
		await runs.cancel(runId);

		return {
			success: true,
			canCancel: true,
			previousStatus: run.status,
			newStatus: "CANCELLED",
			cancelledAt: new Date().toISOString(),
		};
	} catch (error) {
		console.error(`Failed to cancel trigger run ${runId}:`, error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			canCancel: false,
		};
	}
}

/**
 * Checks the status of a Trigger.dev run
 * @param runId - The run ID to check
 * @returns Promise with run status information
 */
export async function getTriggerRunStatus(runId: string) {
	try {
		const run = await runs.retrieve(runId);

		if (!run) {
			return { success: false, error: "Run not found" };
		}

		return {
			success: true,
			status: run.status,
			createdAt: run.createdAt,
			startedAt: run.startedAt,
			completedAt: run.isCompleted ? run.updatedAt : undefined,
			isActive: ["QUEUED", "EXECUTING", "WAITING_FOR_DEPLOY"].includes(run.status),
			canCancel: ["QUEUED", "EXECUTING", "WAITING_FOR_DEPLOY"].includes(run.status),
		};
	} catch (error) {
		console.error(`Failed to get trigger run status ${runId}:`, error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
