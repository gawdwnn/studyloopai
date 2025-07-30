"use client";

import { SessionFeedback } from "@/components/analytics/session-feedback";
import type { SessionAnalytics } from "@/types/session-analytics";
import { useRouter } from "next/navigation";

interface FeedbackClientProps {
	analytics: SessionAnalytics;
}

export function FeedbackClient({ analytics }: FeedbackClientProps) {
	const router = useRouter();

	const handleStartNewSession = () => {
		router.push("/dashboard/adaptive-learning");
	};

	const handleReviewGaps = () => {
		// Navigate to adaptive learning with review mode if available
		router.push("/dashboard/adaptive-learning");
	};

	return (
		<SessionFeedback
			analytics={analytics}
			onStartNewSession={handleStartNewSession}
			onReviewGaps={handleReviewGaps}
		/>
	);
}
