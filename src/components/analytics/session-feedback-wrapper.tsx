"use client";

import { SessionFeedback } from "@/components/analytics/session-feedback";
import type { SessionAnalytics } from "@/types/session-analytics";
import { useRouter } from "next/navigation";

interface SessionFeedbackWrapperProps {
	analytics: SessionAnalytics;
}

export function SessionFeedbackWrapper({
	analytics,
}: SessionFeedbackWrapperProps) {
	const router = useRouter();

	const handleStartNewSession = () => {
		router.push("/dashboard/adaptive-learning/cuecards");
	};

	const handleReviewGaps = () => {
		router.push("/dashboard/adaptive-learning/cuecards?mode=review");
	};

	return (
		<SessionFeedback
			analytics={analytics}
			onStartNewSession={handleStartNewSession}
			onReviewGaps={handleReviewGaps}
		/>
	);
}
