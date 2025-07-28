"use client";

import { CheckCircle, Loader2, XCircle } from "lucide-react";

interface OnDemandGenerationProgressProps {
	isVisible: boolean;
	progress?: {
		status: string;
		updatedAt?: Date;
	} | null;
	contentType?: string;
}

export function OnDemandGenerationProgress({
	isVisible,
	progress,
	contentType = "content",
}: OnDemandGenerationProgressProps) {
	if (!isVisible) return null;

	const isExecuting =
		progress?.status === "EXECUTING" ||
		progress?.status === "QUEUED" ||
		progress?.status === "WAITING_FOR_DEPLOY";

	const isCompleted =
		progress?.status === "COMPLETED" ||
		String(progress?.status || "").includes("COMPLETED");

	const isFailed =
		progress?.status === "CRASHED" ||
		progress?.status === "CANCELED" ||
		progress?.status === "SYSTEM_FAILURE" ||
		progress?.status === "INTERRUPTED" ||
		progress?.status === "TIMED_OUT";

	const getStatusColor = () => {
		if (isCompleted) return "text-green-600 dark:text-green-400";
		if (isFailed) return "text-red-600 dark:text-red-400";
		return "text-blue-600 dark:text-blue-400";
	};

	const getIcon = () => {
		if (isCompleted) return <CheckCircle className="h-4 w-4" />;
		if (isFailed) return <XCircle className="h-4 w-4" />;
		return <Loader2 className="h-4 w-4 animate-spin" />;
	};

	const getStatusText = () => {
		if (isExecuting) {
			return `Generating ${contentType}...`;
		}
		if (isCompleted) {
			return `${contentType} generated successfully!`;
		}
		if (isFailed) {
			return "Generation failed";
		}
		return `Preparing to generate ${contentType}...`;
	};

	return (
		<div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
			{getIcon()}
			<span className="font-medium">{getStatusText()}</span>
			{isExecuting && progress?.updatedAt && (
				<span className="text-xs text-muted-foreground">
					• {progress.updatedAt.toLocaleTimeString()}
				</span>
			)}
		</div>
	);
}
