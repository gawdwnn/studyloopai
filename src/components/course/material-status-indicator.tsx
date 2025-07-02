"use client";

import { Badge } from "@/components/ui/badge";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";

interface MaterialStatusIndicatorProps {
	uploadStatus?: string;
	embeddingStatus?: string;
	totalChunks?: number;
	embeddedChunks?: number;
	runId?: string;
	publicToken?: string;
}

export function MaterialStatusIndicator({
	uploadStatus = "pending",
	embeddingStatus = "pending",
	totalChunks = 0,
	embeddedChunks = 0,
	runId,
	publicToken,
}: MaterialStatusIndicatorProps) {
	// Subscribe to real-time status if runId provided
	const rt = runId ? useRealtimeRun(runId, { accessToken: publicToken }) : undefined;
	const rtStatus = rt?.run?.status;

	if (rtStatus) {
		switch (rtStatus) {
			case "QUEUED":
				return (
					<Badge variant="secondary" className="flex items-center gap-1.5">
						<Clock className="h-3 w-3" /> Queued
					</Badge>
				);
			case "EXECUTING":
			case "REATTEMPTING":
				return (
					<Badge variant="default" className="flex items-center gap-1.5">
						<Loader2 className="h-3 w-3 animate-spin" /> Processing
					</Badge>
				);
			case "COMPLETED":
				return (
					<Badge variant="default" className="flex items-center gap-1.5">
						<CheckCircle className="h-3 w-3" /> Completed
					</Badge>
				);
			case "FAILED":
			case "CANCELED":
			case "CRASHED":
				return (
					<Badge variant="destructive" className="flex items-center gap-1.5">
						<AlertCircle className="h-3 w-3" /> Failed
					</Badge>
				);
		}
	}

	const getStatus = () => {
		// Handle upload phase
		if (uploadStatus === "pending" || uploadStatus === "uploading") {
			return {
				icon: <Loader2 className="h-3 w-3 animate-spin" />,
				text: "Uploading...",
				variant: "secondary",
			};
		}

		if (uploadStatus === "failed") {
			return {
				icon: <AlertCircle className="h-3 w-3" />,
				text: "Upload Failed",
				variant: "destructive",
			};
		}

		// Handle processing/embedding phase
		if (embeddingStatus === "processing") {
			const progress = totalChunks > 0 ? Math.round((embeddedChunks / totalChunks) * 100) : 0;
			return {
				icon: <Loader2 className="h-3 w-3 animate-spin" />,
				text: `Processing (${progress}%)`,
				variant: "default",
			};
		}

		if (embeddingStatus === "completed") {
			return {
				icon: <CheckCircle className="h-3 w-3" />,
				text: "Completed",
				variant: "default",
			};
		}

		if (embeddingStatus === "failed") {
			return {
				icon: <AlertCircle className="h-3 w-3" />,
				text: "Processing Failed",
				variant: "destructive",
			};
		}

		// Default pending state
		return {
			icon: <Clock className="h-3 w-3" />,
			text: "Queued",
			variant: "secondary",
		};
	};

	const { icon, text, variant } = getStatus();

	return (
		<Badge
			variant={variant as "secondary" | "destructive" | "default"}
			className="flex items-center gap-1.5"
		>
			{icon}
			<span>{text}</span>
		</Badge>
	);
}
