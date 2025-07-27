"use client";

import { Badge } from "@/components/ui/badge";
import { env } from "@/env";
import { useCourseMaterialProcessingJob } from "@/stores/course-material-processing-store";
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

interface RealtimeCourseMaterialStatusProps {
	courseMaterial: CourseMaterial;
}

export function RealtimeCourseMaterialStatus({
	courseMaterial,
}: RealtimeCourseMaterialStatusProps) {
	// Get processing job from store using material ID
	const processingJob = useCourseMaterialProcessingJob(courseMaterial.id);

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
		`weekId:${processingJob?.weekId} courseId:${processingJob?.courseId}`,
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
			if (
				[
					"CRASHED",
					"CANCELED",
					"SYSTEM_FAILURE",
					"INTERRUPTED",
					"TIMED_OUT",
				].includes(status)
			) {
				return "failed";
			}

			// Phase 1 running
			if (["EXECUTING", "QUEUED", "WAITING_FOR_DEPLOY"].includes(status)) {
				return "processing";
			}

			// Phase 1 complete - check Phase 2
			if (status === "COMPLETED" || String(status).includes("COMPLETED")) {
				if (phase2Runs) {
					const contentTasks = phase2Runs.filter((run) =>
						[
							"ai-content-orchestrator",
							"generate-summaries",
							"generate-golden-notes",
							"generate-cuecards",
							"generate-mcqs",
							"generate-open-questions",
							"generate-concept-maps",
						].includes(run.taskIdentifier)
					);

					if (contentTasks.length > 0) {
						const completed = contentTasks.filter(
							(run) =>
								run.status === "COMPLETED" ||
								String(run.status).includes("COMPLETED")
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

	// Render simple badge for table cell
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
