"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	isCompletedStatus,
	isContentGenerationTask,
	isFailureStatus,
	isProcessingStatus,
} from "@/constants/trigger-states";
import { env } from "@/env";
import { TriggerErrorClassifier } from "@/lib/errors/trigger-error-classifier";
import { useCourseMaterialProcessingStore } from "@/stores/course-material-processing-store";
import type { CourseMaterial } from "@/types/database-types";
import {
	useRealtimeRun,
	useRealtimeRunsWithTag,
} from "@trigger.dev/react-hooks";
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Loader2,
	RefreshCw,
	Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface EnhancedMaterialStatusProps {
	courseMaterial: CourseMaterial;
	onRetry?: () => void;
}

export function EnhancedMaterialStatus({
	courseMaterial,
	onRetry,
}: EnhancedMaterialStatusProps) {
	const [lastToastedStatus, setLastToastedStatus] = useState<string | null>(
		null
	);
	const [hasInitialized, setHasInitialized] = useState(false);

	const {
		getCourseMaterialProcessingJob,
		getErrorDetails,
		setErrorDetails,
		clearErrorDetails,
	} = useCourseMaterialProcessingStore();

	// Get processing job and error details from store
	const processingJob = getCourseMaterialProcessingJob(courseMaterial.id);
	const storedError = getErrorDetails(courseMaterial.id);

	// Phase 1: Upload & Embedding tracking
	const { run: phase1RunData } = useRealtimeRun(
		processingJob?.runId || undefined,
		{
			accessToken: processingJob?.publicAccessToken || "",
			baseURL: env.NEXT_PUBLIC_TRIGGER_API_URL,
			enabled: Boolean(
				processingJob?.runId && processingJob?.publicAccessToken
			),
		}
	);

	// Phase 2: Content Generation tracking
	const { runs: phase2Runs } = useRealtimeRunsWithTag(
		[`weekId:${processingJob?.weekId}`, `courseId:${processingJob?.courseId}`],
		{
			baseURL: env.NEXT_PUBLIC_TRIGGER_API_URL,
			enabled: Boolean(processingJob?.weekId && processingJob?.courseId),
		}
	);

	// Determine current state
	const getCurrentState = () => {
		if (!processingJob) {
			// No active tracking - use database status
			if (
				courseMaterial.uploadStatus === "failed" ||
				courseMaterial.embeddingStatus === "failed"
			) {
				return "failed";
			}
			if (
				courseMaterial.uploadStatus === "completed" &&
				courseMaterial.embeddingStatus === "completed"
			) {
				return "ready";
			}
			if (courseMaterial.embeddingStatus === "processing") {
				return "processing";
			}
			return "pending";
		}

		// Active tracking - check real-time status
		if (phase1RunData) {
			const { status } = phase1RunData;

			// Phase 1 failed
			if (isFailureStatus(status)) {
				return "failed";
			}

			// Phase 1 running
			if (isProcessingStatus(status)) {
				return "processing";
			}

			// Phase 1 complete - check Phase 2
			if (isCompletedStatus(status)) {
				if (phase2Runs) {
					const contentTasks = phase2Runs.filter((run) =>
						isContentGenerationTask(run.taskIdentifier)
					);

					if (contentTasks.length > 0) {
						const failed = contentTasks.filter((run) =>
							isFailureStatus(run.status)
						);

						if (failed.length > 0) {
							return "failed";
						}

						const completed = contentTasks.filter((run) =>
							isCompletedStatus(run.status)
						);

						if (completed.length === contentTasks.length) {
							return "ready";
						}
					}
				}
				return "generating";
			}
		}

		return "processing";
	};

	const state = getCurrentState();
	const hasError = state === "failed" && storedError;

	// Derived state: should we toast?
	const shouldToast =
		state !== lastToastedStatus && (state === "failed" || state === "ready");
	const handleRetry = useCallback(() => {
		clearErrorDetails(courseMaterial.id);
		if (onRetry) {
			onRetry();
		}
	}, [clearErrorDetails, courseMaterial.id, onRetry]);

	// Extract and classify error details from run data
	useEffect(() => {
		if (phase1RunData?.status && isFailureStatus(phase1RunData.status)) {
			const errorClassification = TriggerErrorClassifier.classify({
				message: phase1RunData.output?.message,
				code: phase1RunData.output?.code,
				name: phase1RunData.output?.name,
				...phase1RunData.output,
			});

			if (errorClassification && !storedError) {
				setErrorDetails(courseMaterial.id, errorClassification);
			}
		} else if (phase1RunData?.status === "COMPLETED" && storedError) {
			// Clear error details when job succeeds
			clearErrorDetails(courseMaterial.id);
		}
	}, [
		phase1RunData,
		courseMaterial.id,
		storedError,
		setErrorDetails,
		clearErrorDetails,
	]);

	// Check phase 2 errors
	useEffect(() => {
		if (phase2Runs) {
			const failedRuns = phase2Runs.filter((run) =>
				isFailureStatus(run.status)
			);

			if (failedRuns.length > 0 && !storedError) {
				const lastFailedRun = failedRuns[failedRuns.length - 1];
				const errorClassification = TriggerErrorClassifier.classify({
					message: lastFailedRun.output?.message,
					code: lastFailedRun.output?.code,
					name: lastFailedRun.output?.name,
					...lastFailedRun.output,
				});

				if (errorClassification) {
					setErrorDetails(courseMaterial.id, errorClassification);
				}
			}
		}
	}, [phase2Runs, courseMaterial.id, storedError, setErrorDetails]);

	// Toast effect with cleanup and mount protection
	useEffect(() => {
		let isMounted = true;

		// Initialize tracking on first render without toasting
		if (!hasInitialized) {
			setLastToastedStatus(state);
			setHasInitialized(true);
			return;
		}

		if (shouldToast && isMounted) {
			if (state === "failed" && storedError) {
				toast.error(storedError.userMessage, {
					description: storedError.suggestedAction,
					action:
						storedError.retryable && onRetry
							? {
									label: "Try Again",
									onClick: handleRetry,
								}
							: undefined,
				});
			} else if (state === "ready") {
				toast.success("Content ready!", {
					description: `${courseMaterial.fileName || courseMaterial.title} has been processed successfully.`,
				});
			}
			setLastToastedStatus(state);
		}

		return () => {
			isMounted = false;
		};
	}, [
		shouldToast,
		state,
		storedError,
		courseMaterial.fileName,
		courseMaterial.title,
		onRetry,
		handleRetry,
		hasInitialized,
	]);

	// Reset cleanup on new processing
	useEffect(() => {
		if (state === "processing") {
			setLastToastedStatus(null); // Reset toast tracking for new processing cycle
			// Keep hasInitialized as true - we don't want to re-initialize
			toast.dismiss(); // Clear existing toasts for this material
		}
	}, [state]);

	// Reset cleanup on material change
	const prevMaterialIdRef = useRef(courseMaterial.id);
	useEffect(() => {
		if (prevMaterialIdRef.current !== courseMaterial.id) {
			setLastToastedStatus(null);
			setHasInitialized(false); // Reset initialization flag for completely new material
			prevMaterialIdRef.current = courseMaterial.id;
		}
	});

	// Render compact badge for all states, with popover for errors
	switch (state) {
		case "processing":
			return (
				<Badge variant="secondary" className="text-xs">
					<Loader2 className="h-3 w-3 animate-spin mr-1" />
					Processing
				</Badge>
			);
		case "generating":
			return (
				<Badge
					variant="secondary"
					className="text-xs bg-purple-100 text-purple-700"
				>
					<Sparkles className="h-3 w-3 animate-pulse mr-1" />
					Generating
				</Badge>
			);
		case "ready":
			return (
				<Badge variant="default" className="text-xs bg-green-600">
					<CheckCircle className="h-3 w-3 mr-1" />
					Ready
				</Badge>
			);
		case "failed":
			// Failed state with error details in popover
			if (hasError) {
				return (
					<Popover>
						<PopoverTrigger asChild>
							<Badge
								variant="destructive"
								className="text-xs cursor-pointer hover:bg-destructive/80"
							>
								<AlertCircle className="h-3 w-3 mr-1" />
								Failed
							</Badge>
						</PopoverTrigger>
						<PopoverContent className="w-80 p-3" align="start" side="bottom">
							<div className="space-y-3">
								<div className="space-y-1">
									<p className="font-medium text-sm">
										{storedError.userMessage}
									</p>
									{storedError.suggestedAction && (
										<p className="text-xs text-muted-foreground">
											{storedError.suggestedAction}
										</p>
									)}
								</div>

								{storedError.retryable && onRetry && (
									<Button
										size="sm"
										variant="outline"
										onClick={handleRetry}
										className="w-full h-8"
									>
										<RefreshCw className="h-3 w-3 mr-1" />
										Try Again
									</Button>
								)}

								<div className="text-xs text-muted-foreground pt-2 border-t">
									<div className="flex justify-between">
										<span>Error Type:</span>
										<span className="font-mono">{storedError.category}</span>
									</div>
									<div className="flex justify-between">
										<span>Severity:</span>
										<span className="font-mono">{storedError.severity}</span>
									</div>
								</div>
							</div>
						</PopoverContent>
					</Popover>
				);
			}
			// Fallback to simple failed badge if no error details
			return (
				<Badge variant="destructive" className="text-xs">
					<AlertCircle className="h-3 w-3 mr-1" />
					Failed
				</Badge>
			);
		default:
			return (
				<Badge variant="outline" className="text-xs">
					<Clock className="h-3 w-3 mr-1" />
					Pending
				</Badge>
			);
	}
}
