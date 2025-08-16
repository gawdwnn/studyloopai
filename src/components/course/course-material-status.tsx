"use client";

import { Badge } from "@/components/ui/badge";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { env } from "@/env";
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
	Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Trigger.dev status constants - Complete RunStatus enum coverage
const TRIGGER_FAILURE_STATES = [
	"CRASHED",
	"CANCELED",
	"SYSTEM_FAILURE",
	"INTERRUPTED",
	"TIMED_OUT",
	"FAILED",
	"EXPIRED",
] as const;

const TRIGGER_PROCESSING_STATES = [
	"EXECUTING",
	"QUEUED",
	"WAITING_FOR_DEPLOY",
	"REATTEMPTING",
	"FROZEN",
	"DELAYED",
] as const;

const TRIGGER_SUCCESS_STATES = ["COMPLETED"] as const;

const CONTENT_GENERATION_TASKS = [
	"ai-content-orchestrator",
	"generate-summaries",
	"generate-golden-notes",
	"generate-cuecards",
	"generate-mcqs",
	"generate-open-questions",
	"generate-concept-maps",
] as const;

const isFailureStatus = (status: string) =>
	(TRIGGER_FAILURE_STATES as readonly string[]).includes(status);

const isProcessingStatus = (status: string) =>
	(TRIGGER_PROCESSING_STATES as readonly string[]).includes(status);

const isSuccessStatus = (status: string) =>
	(TRIGGER_SUCCESS_STATES as readonly string[]).includes(status);

const isContentGenerationTask = (taskId: string) =>
	(CONTENT_GENERATION_TASKS as readonly string[]).includes(taskId);

type MaterialStatus =
	| "pending"
	| "processing"
	| "generating"
	| "ready"
	| "failed";

interface TriggerRun {
	status: string;
	taskIdentifier: string;
	output?: {
		message?: string;
	};
}

interface StatusTrackingData {
	material: Pick<
		CourseMaterial,
		"id" | "uploadStatus" | "embeddingStatus" | "fileName" | "title"
	> | null;
	weekFeatures: { generationStatus: string | null } | null;
}

interface CourseMaterialStatusProps {
	courseMaterial: CourseMaterial;
	runId?: string;
	publicAccessToken?: string;
	weekId: string;
	statusTrackingData?: StatusTrackingData | null;
}

function getDatabaseStatus(
	courseMaterial: CourseMaterial,
	statusTrackingData?: StatusTrackingData | null
): MaterialStatus {
	// Use comprehensive status tracking data if available (preferred)
	if (statusTrackingData) {
		const materialData = statusTrackingData.material;
		const weekFeaturesData = statusTrackingData.weekFeatures;

		// Check course material status (Phase 1: Upload/Embedding)
		if (materialData) {
			if (
				materialData.uploadStatus === "failed" ||
				materialData.embeddingStatus === "failed"
			) {
				return "failed";
			}
		}

		// Check week features generation status (Phase 2: Content Generation)
		if (weekFeaturesData?.generationStatus) {
			if (weekFeaturesData.generationStatus === "failed") {
				return "failed";
			}
			if (weekFeaturesData.generationStatus === "processing") {
				return "generating";
			}
			if (weekFeaturesData.generationStatus === "completed") {
				// Phase 1 must also be complete for overall "ready" status
				if (
					(materialData?.uploadStatus === "completed" ||
						courseMaterial.uploadStatus === "completed") &&
					(materialData?.embeddingStatus === "completed" ||
						courseMaterial.embeddingStatus === "completed")
				) {
					return "ready";
				}
			}
		}

		// Phase 1 complete, but no Phase 2 status available
		if (
			(materialData?.uploadStatus === "completed" ||
				courseMaterial.uploadStatus === "completed") &&
			(materialData?.embeddingStatus === "completed" ||
				courseMaterial.embeddingStatus === "completed")
		) {
			return "ready";
		}

		if (
			materialData?.embeddingStatus === "processing" ||
			courseMaterial.embeddingStatus === "processing"
		) {
			return "processing";
		}

		return "pending";
	}

	// Fallback to prop-based logic when comprehensive data is not available
	// Check course material status (Phase 1: Upload/Embedding)
	if (
		courseMaterial.uploadStatus === "failed" ||
		courseMaterial.embeddingStatus === "failed"
	) {
		return "failed";
	}

	// Phase 1 complete, but no Phase 2 status available
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

function getProcessingStatus(
	phase1Run: TriggerRun | null | undefined,
	phase2Runs: TriggerRun[] | null | undefined,
	courseMaterial: CourseMaterial,
	statusTrackingData?: StatusTrackingData | null
): MaterialStatus {
	// No active tracking - use database status
	if (!phase1Run) {
		return getDatabaseStatus(courseMaterial, statusTrackingData);
	}

	// Phase 1 failed
	if (isFailureStatus(phase1Run.status)) {
		return "failed";
	}

	// Phase 1 processing
	if (isProcessingStatus(phase1Run.status)) {
		return "processing";
	}

	// Phase 1 complete - check Phase 2
	if (isSuccessStatus(phase1Run.status)) {
		if (phase2Runs && phase2Runs.length > 0) {
			const contentTasks = phase2Runs.filter((run) =>
				isContentGenerationTask(run.taskIdentifier)
			);

			if (contentTasks.length > 0) {
				const failed = contentTasks.some((run) => isFailureStatus(run.status));
				if (failed) return "failed";

				const allCompleted = contentTasks.every((run) =>
					isSuccessStatus(run.status)
				);
				if (allCompleted) return "ready";

				return "generating"; // Phase 2 in progress
			}
		}
		return "ready"; // Phase 1 complete, no Phase 2
	}

	return "processing";
}

export function CourseMaterialStatus({
	courseMaterial,
	runId,
	publicAccessToken,
	weekId,
	statusTrackingData,
}: CourseMaterialStatusProps) {
	const [lastToastedStatus, setLastToastedStatus] = useState<string | null>(
		null
	);
	const [hasInitialized, setHasInitialized] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Phase 1: Upload & Embedding tracking
	const { run: phase1Run } = useRealtimeRun(runId, {
		accessToken: publicAccessToken || undefined,
		baseURL: env.NEXT_PUBLIC_TRIGGER_API_URL,
		enabled: Boolean(runId && publicAccessToken),
	});

	// Phase 2: Content Generation tracking
	const { runs: phase2Runs } = useRealtimeRunsWithTag(`weekId:${weekId}`, {
		accessToken: publicAccessToken || "",
		baseURL: env.NEXT_PUBLIC_TRIGGER_API_URL,
		enabled: Boolean(weekId && publicAccessToken),
	});

	// Determine current status
	const status = getProcessingStatus(
		phase1Run,
		phase2Runs,
		courseMaterial,
		statusTrackingData
	);
	const shouldToast =
		status !== lastToastedStatus && (status === "failed" || status === "ready");

	// Extract error from Phase 1
	useEffect(() => {
		if (phase1Run && isFailureStatus(phase1Run.status)) {
			const errorMessage = phase1Run.output?.message || "Processing failed";
			setError(errorMessage);
		} else if (phase1Run && isSuccessStatus(phase1Run.status)) {
			setError(null);
		}
	}, [phase1Run]);

	// Extract error from Phase 2
	useEffect(() => {
		if (phase2Runs && phase2Runs.length > 0) {
			const failedRuns = phase2Runs.filter((run) =>
				isFailureStatus(run.status)
			);
			if (failedRuns.length > 0) {
				const lastFailedRun = failedRuns[failedRuns.length - 1];
				const errorMessage =
					lastFailedRun.output?.message || "Content generation failed";
				setError(errorMessage);
			}
		}
	}, [phase2Runs]);

	// Toast notifications with mount protection
	useEffect(() => {
		// Initialize tracking on first render without toasting for completed states
		if (!hasInitialized) {
			setHasInitialized(true);
			if (status === "ready" || status === "failed") {
				setLastToastedStatus(status);
			}
			return;
		}

		if (shouldToast) {
			if (status === "failed") {
				toast.error("Processing failed", {
					description: error || "An error occurred during processing",
				});
			} else if (status === "ready") {
				toast.success("Content ready!", {
					description: `${courseMaterial.fileName || courseMaterial.title} has been processed successfully.`,
				});
			}
			setLastToastedStatus(status);
		}
	}, [
		shouldToast,
		status,
		error,
		courseMaterial.fileName,
		courseMaterial.title,
		hasInitialized,
	]);

	// Reset state on new processing
	useEffect(() => {
		if (status === "processing") {
			setLastToastedStatus(null);
			toast.dismiss();
		}
	}, [status]);

	// Reset state on material change
	const prevMaterialIdRef = useRef(courseMaterial.id);
	useEffect(() => {
		if (prevMaterialIdRef.current !== courseMaterial.id) {
			setLastToastedStatus(null);
			setHasInitialized(false);
			setError(null);
			prevMaterialIdRef.current = courseMaterial.id;
		}
	});

	// Render status badge
	switch (status) {
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
			if (error) {
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
									<p className="font-medium text-sm">Processing Failed</p>
									<p className="text-xs text-muted-foreground">{error}</p>
								</div>
							</div>
						</PopoverContent>
					</Popover>
				);
			}
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
