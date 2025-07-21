"use client";

import { Badge } from "@/components/ui/badge";

interface MaterialStatusIndicatorProps {
	uploadStatus?: string;
	embeddingStatus?: string;
	totalChunks?: number;
	embeddedChunks?: number;
}

export function MaterialStatusIndicator({
	uploadStatus = "pending",
	embeddingStatus = "pending",
}: MaterialStatusIndicatorProps) {
	// Simplified material status indicator
	// Complex realtime tracking has been simplified in favor of basic status display
	
	if (uploadStatus === "failed" || embeddingStatus === "failed") {
		return (
			<Badge variant="destructive" className="text-xs">
				Failed
			</Badge>
		);
	}

	if (uploadStatus === "completed" && embeddingStatus === "completed") {
		return (
			<Badge variant="default" className="text-xs bg-green-600">
				Ready
			</Badge>
		);
	}

	if (embeddingStatus === "processing") {
		return (
			<Badge variant="secondary" className="text-xs">
				Processing
			</Badge>
		);
	}

	return (
		<Badge variant="outline" className="text-xs">
			Pending
		</Badge>
	);
}