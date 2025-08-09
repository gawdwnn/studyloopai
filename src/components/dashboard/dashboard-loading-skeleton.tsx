import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_COURSES = [
	"course-1",
	"course-2",
	"course-3",
	"course-4",
	"course-5",
	"course-6",
	"course-7",
	"course-8",
];

export function DashboardLoadingSkeleton() {
	return (
		<div className="space-y-8">
			{/* Page Heading Skeleton */}
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-36 sm:h-10 sm:w-44" />
					<Skeleton className="h-4 w-48 sm:h-5 sm:w-56" />
				</div>
				<Skeleton className="h-10 w-full sm:w-40" />
			</div>

			{/* Dashboard Stats Skeleton */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-lg border bg-card p-6">
						<div className="flex items-center justify-between space-y-0 pb-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-4" />
						</div>
						<div className="space-y-1">
							<Skeleton className="h-7 w-16" />
							<Skeleton className="h-3 w-32" />
						</div>
					</div>
				))}
			</div>

			{/* Section Title Skeleton */}
			<Skeleton className="h-6 w-32 sm:h-7 sm:w-36" />

			{/* Course Grid Skeleton */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
				{SKELETON_COURSES.map((courseId) => (
					<div key={courseId} className="h-48">
						<div className="w-full h-full rounded-lg border bg-card hover:shadow-lg transition-shadow">
							<div className="p-6 h-full flex flex-col">
								{/* Course Header */}
								<div className="flex items-start justify-between mb-4">
									<div className="space-y-2 flex-1">
										<Skeleton className="h-5 w-3/4" />
										<Skeleton className="h-3 w-1/2" />
									</div>
									<Skeleton className="h-8 w-8 rounded" />
								</div>

								{/* Course Stats */}
								<div className="mt-auto space-y-3">
									<div className="flex items-center justify-between">
										<Skeleton className="h-3 w-16" />
										<Skeleton className="h-3 w-12" />
									</div>
									<div className="flex items-center justify-between">
										<Skeleton className="h-3 w-20" />
										<Skeleton className="h-3 w-8" />
									</div>
									<Skeleton className="h-1 w-full rounded-full" />
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
