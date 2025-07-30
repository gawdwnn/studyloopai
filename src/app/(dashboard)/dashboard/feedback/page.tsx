import { SessionCard } from "@/components/analytics/session-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import {
	getRecentSessionHistory,
	getSessionAnalytics,
} from "@/lib/actions/session-analytics";
import { BarChart3, Play } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FeedbackClient } from "./feedback-client";

export const metadata: Metadata = {
	title: "Session Feedback - StudyLoop AI",
	description:
		"Detailed analytics and feedback from your learning session with adaptive insights and spaced repetition data.",
};

interface FeedbackPageProps {
	searchParams: Promise<{
		sessionId?: string;
	}>;
}

async function SessionFeedbackContent({ sessionId }: { sessionId: string }) {
	const analytics = await getSessionAnalytics(sessionId);

	if (!analytics) {
		notFound();
	}

	return <FeedbackClient analytics={analytics} />;
}

async function SessionHistoryContent() {
	const sessions = await getRecentSessionHistory();

	if (sessions.length === 0) {
		return (
			<div className="space-y-6 sm:space-y-8">
				<PageHeading
					title="Feedback"
					description="Get detailed analytics and feedback on your learning progress and performance."
				/>

				<EmptyState
					icon={BarChart3}
					title="No Learning Sessions Yet"
					description="Complete an adaptive learning session (cuecards, multiple choice, or open questions) to view detailed analytics, performance insights, and personalized feedback on your learning progress."
				>
					<Button asChild className="w-full sm:w-auto">
						<Link href="/dashboard/adaptive-learning">
							<Play className="w-4 h-4 mr-2" />
							Start First Session
						</Link>
					</Button>
				</EmptyState>
			</div>
		);
	}

	return (
		<div className="space-y-6 sm:space-y-8">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<PageHeading
					title="Session Feedback"
					description="View your learning session history with detailed analytics and performance insights."
				/>
				<Button size="sm" asChild>
					<Link href="/dashboard/adaptive-learning">
						<Play className="w-4 h-4 mr-2" />
						New Session
					</Link>
				</Button>
			</div>

			{/* Summary Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-card rounded-lg border p-4">
					<div className="flex items-center gap-2 mb-2">
						<BarChart3 className="w-4 h-4 text-muted-foreground" />
						<span className="text-sm font-medium text-muted-foreground">
							Total Sessions
						</span>
					</div>
					<div className="text-2xl font-bold">{sessions.length}</div>
				</div>

				<div className="bg-card rounded-lg border p-4">
					<div className="flex items-center gap-2 mb-2">
						<BarChart3 className="w-4 h-4 text-muted-foreground" />
						<span className="text-sm font-medium text-muted-foreground">
							Completed
						</span>
					</div>
					<div className="text-2xl font-bold">
						{sessions.filter((s) => s.isCompleted).length}
					</div>
				</div>

				<div className="bg-card rounded-lg border p-4">
					<div className="flex items-center gap-2 mb-2">
						<BarChart3 className="w-4 h-4 text-muted-foreground" />
						<span className="text-sm font-medium text-muted-foreground">
							Avg Accuracy
						</span>
					</div>
					<div className="text-2xl font-bold">
						{sessions.length > 0
							? Math.round(
									sessions.reduce((sum, s) => sum + s.accuracy, 0) /
										sessions.length
								)
							: 0}
						%
					</div>
				</div>

				<div className="bg-card rounded-lg border p-4">
					<div className="flex items-center gap-2 mb-2">
						<BarChart3 className="w-4 h-4 text-muted-foreground" />
						<span className="text-sm font-medium text-muted-foreground">
							Total Items
						</span>
					</div>
					<div className="text-2xl font-bold">
						{sessions.reduce((sum, s) => sum + s.itemsCompleted, 0)}
					</div>
				</div>
			</div>

			{/* Session Cards Grid */}
			<div className="space-y-4">
				<h2 className="text-lg font-semibold text-foreground">
					Recent Sessions
				</h2>
				<div className="grid gap-4">
					{sessions.map((session) => (
						<SessionCard
							key={session.id}
							session={session}
							className="hover:bg-muted/50"
						/>
					))}
				</div>
			</div>

			{/* Load More (Future Enhancement) */}
			{sessions.length >= 20 && (
				<div className="flex justify-center pt-6">
					<Button variant="outline" disabled>
						Load More Sessions
						<span className="text-xs text-muted-foreground ml-2">
							(Coming Soon)
						</span>
					</Button>
				</div>
			)}
		</div>
	);
}

export default async function FeedbackPage({
	searchParams,
}: FeedbackPageProps) {
	const { sessionId } = await searchParams;

	// If sessionId is provided, show detailed session analytics
	if (sessionId) {
		return (
			<Suspense>
				<SessionFeedbackContent sessionId={sessionId} />
			</Suspense>
		);
	}

	// Otherwise show session history (or empty state if no sessions)
	return (
		<Suspense>
			<SessionHistoryContent />
		</Suspense>
	);
}
