"use client";

import type { ClassifiedError } from "@/lib/errors/trigger-error-classifier";
import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

export interface ProcessingJob {
	runId: string;
	publicAccessToken: string;
	weekId: string;
	courseId: string;
	timestamp: number;
	errorDetails?: ClassifiedError;
}

export interface ProcessingJobInput {
	runId: string;
	publicAccessToken: string;
	weekId: string;
	courseId: string;
}

interface CourseMaterialProcessingState {
	// Map of materialId -> ProcessingJob
	processingJobs: Map<string, ProcessingJob>;

	// Batch tracking for uploads
	uploadBatches: Map<string, string[]>; // batchId -> materialIds[]

	// Error tracking
	errorDetails: Map<string, ClassifiedError>; // materialId -> error details
}

interface CourseMaterialProcessingActions {
	// Individual material tracking
	setCourseMaterialProcessingJob: (
		materialId: string,
		job: ProcessingJobInput
	) => void;
	getCourseMaterialProcessingJob: (
		materialId: string
	) => ProcessingJob | undefined;
	removeCourseMaterialProcessingJob: (materialId: string) => void;

	// Batch operations for upload wizard
	setBatchProcessingJob: (
		materialIds: string[],
		job: ProcessingJobInput
	) => void;
	getBatchProcessingJobs: (batchId: string) => string[];

	// Error management
	setErrorDetails: (materialId: string, error: ClassifiedError) => void;
	getErrorDetails: (materialId: string) => ClassifiedError | undefined;
	clearErrorDetails: (materialId: string) => void;

	// Cleanup operations
	clearExpiredJobs: (maxAgeHours?: number) => void;
	clearAllJobs: () => void;
}

export type CourseMaterialProcessingStore = CourseMaterialProcessingState &
	CourseMaterialProcessingActions;

const MAX_JOB_AGE_HOURS = 24; // Jobs older than 24 hours are considered stale

export const useCourseMaterialProcessingStore =
	create<CourseMaterialProcessingStore>()(
		devtools(
			subscribeWithSelector((set, get) => ({
				// Initial state
				processingJobs: new Map(),
				uploadBatches: new Map(),
				errorDetails: new Map(),

				// Individual material tracking
				setCourseMaterialProcessingJob: (materialId, job) =>
					set((state) => {
						const newJobs = new Map(state.processingJobs);
						newJobs.set(materialId, { ...job, timestamp: Date.now() });
						return { processingJobs: newJobs };
					}),

				getCourseMaterialProcessingJob: (materialId) => {
					return get().processingJobs.get(materialId);
				},

				removeCourseMaterialProcessingJob: (materialId) =>
					set((state) => {
						const newJobs = new Map(state.processingJobs);
						newJobs.delete(materialId);
						return { processingJobs: newJobs };
					}),

				// Batch operations for upload wizard
				setBatchProcessingJob: (materialIds, job) =>
					set((state) => {
						const newJobs = new Map(state.processingJobs);
						const batchId = job.runId; // Use runId as batchId
						const newBatches = new Map(state.uploadBatches);

						// Set processing job for each material in the batch
						for (const materialId of materialIds) {
							newJobs.set(materialId, { ...job, timestamp: Date.now() });
						}

						// Track the batch
						newBatches.set(batchId, materialIds);

						return {
							processingJobs: newJobs,
							uploadBatches: newBatches,
						};
					}),

				getBatchProcessingJobs: (batchId) => {
					return get().uploadBatches.get(batchId) || [];
				},

				// Error management
				setErrorDetails: (materialId, error) =>
					set((state) => {
						const newErrorDetails = new Map(state.errorDetails);
						newErrorDetails.set(materialId, error);
						return { errorDetails: newErrorDetails };
					}),

				getErrorDetails: (materialId) => {
					return get().errorDetails.get(materialId);
				},

				clearErrorDetails: (materialId) =>
					set((state) => {
						const newErrorDetails = new Map(state.errorDetails);
						newErrorDetails.delete(materialId);
						return { errorDetails: newErrorDetails };
					}),

				// Cleanup operations
				clearExpiredJobs: (maxAgeHours = MAX_JOB_AGE_HOURS) =>
					set((state) => {
						const now = Date.now();
						const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
						const newJobs = new Map(state.processingJobs);
						const newBatches = new Map(state.uploadBatches);

						// Remove expired jobs
						for (const [materialId, job] of newJobs.entries()) {
							if (now - job.timestamp > maxAge) {
								newJobs.delete(materialId);
							}
						}

						// Remove expired batches
						for (const [batchId, materialIds] of newBatches.entries()) {
							const allMaterialsExpired = materialIds.every(
								(materialId) => !newJobs.has(materialId)
							);
							if (allMaterialsExpired) {
								newBatches.delete(batchId);
							}
						}

						// Clean up error details for expired jobs
						const newErrorDetails = new Map(state.errorDetails);
						for (const materialId of state.errorDetails.keys()) {
							if (!newJobs.has(materialId)) {
								newErrorDetails.delete(materialId);
							}
						}

						return {
							processingJobs: newJobs,
							uploadBatches: newBatches,
							errorDetails: newErrorDetails,
						};
					}),

				clearAllJobs: () =>
					set({
						processingJobs: new Map(),
						uploadBatches: new Map(),
						errorDetails: new Map(),
					}),
			})),
			{
				name: "material-processing-store",
			}
		)
	);

// Hook for getting a specific material's processing job
export const useCourseMaterialProcessingJob = (materialId: string) => {
	return useCourseMaterialProcessingStore((state) =>
		state.processingJobs.get(materialId)
	);
};

// Hook for cleanup effect - using stable references to prevent unnecessary re-renders
export const useCourseMaterialProcessingCleanup = () => {
	const clearExpiredJobs = useCourseMaterialProcessingStore(
		(state) => state.clearExpiredJobs
	);
	const clearAllJobs = useCourseMaterialProcessingStore(
		(state) => state.clearAllJobs
	);

	// Store functions are stable references from Zustand, so this memoization is sufficient
	return { clearExpiredJobs, clearAllJobs };
};
