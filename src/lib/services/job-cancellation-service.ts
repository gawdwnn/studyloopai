import { cancelTriggerRun } from "@/lib/services/trigger-job-service";

export interface JobCancellationResult {
	jobsCancelled: number;
	cancelledJobs: string[];
	failedCancellations: Array<{
		runId: string;
		error: string;
	}>;
}

/**
 * Cancel multiple background jobs
 */
export async function cancelMultipleJobs(runIds: string[]): Promise<JobCancellationResult> {
	const cancelledJobs: string[] = [];
	const failedCancellations: Array<{ runId: string; error: string }> = [];

	if (runIds.length === 0) {
		return {
			jobsCancelled: 0,
			cancelledJobs: [],
			failedCancellations: [],
		};
	}

	for (const runId of runIds) {
		try {
			const jobCancellationResult = await cancelTriggerRun(runId);

			if (jobCancellationResult.success) {
				cancelledJobs.push(runId);
			} else {
				failedCancellations.push({
					runId,
					error: jobCancellationResult.error || "Unknown cancellation error",
				});
				console.warn("Could not cancel background job", {
					runId,
					error: jobCancellationResult.error,
					canCancel: jobCancellationResult.canCancel,
					status: jobCancellationResult.status,
				});
			}
		} catch (jobError) {
			const errorMsg = jobError instanceof Error ? jobError.message : "Unknown error";
			failedCancellations.push({
				runId,
				error: errorMsg,
			});
			console.warn("Exception during job cancellation for runId:", runId, jobError);
		}
	}

	return {
		jobsCancelled: cancelledJobs.length,
		cancelledJobs,
		failedCancellations,
	};
}

/**
 * Cancel a single background job
 */
export async function cancelSingleJob(runId: string): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		const result = await cancelTriggerRun(runId);
		return {
			success: result.success,
			error: result.error,
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : "Unknown error";
		console.warn("Exception during job cancellation for runId:", runId, error);
		return {
			success: false,
			error: errorMsg,
		};
	}
}

/**
 * Extract run IDs from materials data
 */
export function extractRunIds(materials: Array<{ runId: string | null }>): string[] {
	return materials
		.map((material) => material.runId)
		.filter((runId): runId is string => runId !== null);
}
