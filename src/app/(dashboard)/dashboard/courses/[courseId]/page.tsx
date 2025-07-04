import { ActivityChart } from "@/components/dashboard/overview/activity-chart";
import { ExamCountdownCard } from "@/components/dashboard/overview/exam-countdown-card";
import { PerformanceList } from "@/components/dashboard/overview/performance-list";
import { ScoreCard } from "@/components/dashboard/overview/score-card";
import { StatCard } from "@/components/dashboard/overview/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface CourseOverviewPageProps {
	params: {
		courseId: string;
	};
}

export default async function CourseOverviewPage({ params }: CourseOverviewPageProps) {
	if (!params.courseId) {
		notFound();
	}

	// Mock data - replace with actual data fetching based on params.courseId
	const topCourses = [
		{ name: "Topic 1", performance: 90 },
		{ name: "Topic 2", performance: 85 },
		{ name: "Topic 3", performance: 82 },
	];
	const lowCourses = [
		{ name: "Topic 4", performance: 40 },
		{ name: "Topic 5", performance: 55 },
		{ name: "Topic 6", performance: 60 },
	];

	return (
		<div className="flex flex-col space-y-6 flex-1">
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
				<div className="lg:col-span-3">
					<Suspense fallback={<Skeleton className="h-[140px] w-full" />}>
						<ExamCountdownCard />
					</Suspense>
				</div>
				<div className="lg:col-span-2">
					<Suspense fallback={<Skeleton className="h-[140px] w-full" />}>
						<StatCard title="Files" value="2" />
					</Suspense>
				</div>
				<div className="lg:col-span-2">
					<Suspense fallback={<Skeleton className="h-[140px] w-full" />}>
						<StatCard title="Notes" value="15" />
					</Suspense>
				</div>
				<div className="lg:col-span-2">
					<Suspense fallback={<Skeleton className="h-[140px] w-full" />}>
						<StatCard title="Exercises" value="20" />
					</Suspense>
				</div>
				<div className="lg:col-span-3">
					<Suspense fallback={<Skeleton className="h-[140px] w-full" />}>
						<ScoreCard />
					</Suspense>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3 flex-1">
				<div className="lg:col-span-2 flex flex-col">
					<Suspense fallback={<Skeleton className="h-[350px] w-full flex-1" />}>
						<ActivityChart />
					</Suspense>
				</div>
				<div className="space-y-6 flex flex-col">
					<Suspense fallback={<Skeleton className="h-[200px] w-full flex-1" />}>
						<PerformanceList title="Top performing topics" courses={topCourses} />
					</Suspense>
					<Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
						<PerformanceList title="Low performing topics" courses={lowCourses} />
					</Suspense>
				</div>
			</div>
		</div>
	);
}
