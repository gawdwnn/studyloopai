import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_FEATURES = ["feature-1", "feature-2", "feature-3", "feature-4"];

export default function AdaptiveLearningLoading() {
	return (
		<div className="space-y-6">
			{/* Page Heading Skeleton */}
			<div className="space-y-3">
				<Skeleton className="h-8 w-48 sm:h-10 sm:w-56" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-full max-w-4xl" />
					<Skeleton className="h-4 w-3/4 max-w-3xl" />
					<Skeleton className="h-4 w-5/6 max-w-3xl" />
				</div>
			</div>

			{/* Feature Cards Grid Skeleton */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{SKELETON_FEATURES.map((featureId) => (
					<div key={featureId} className="h-full">
						<div className="h-full flex flex-col rounded-lg border bg-card p-6 space-y-4">
							{/* Card Header */}
							<div className="flex items-center justify-between">
								<Skeleton className="h-9 w-9 rounded-lg" />
								<Skeleton className="h-5 w-20 rounded-full" />
							</div>

							{/* Card Content */}
							<div className="flex-1 space-y-3">
								<Skeleton className="h-5 w-3/4" />
								<div className="space-y-1">
									<Skeleton className="h-3 w-full" />
									<Skeleton className="h-3 w-4/5" />
									<Skeleton className="h-3 w-3/4" />
								</div>
							</div>

							{/* Card Button */}
							<Skeleton className="h-8 w-full rounded" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
