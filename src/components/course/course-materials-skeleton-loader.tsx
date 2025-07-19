import { Skeleton } from "@/components/ui/skeleton";

export function CourseMaterialsSkeletonLoader() {
	return (
		<div className="space-y-6">
			{/* Header section skeleton */}
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-5 w-96" />
				</div>
				<div className="w-full md:w-auto">
					<Skeleton className="h-10 w-32" />
				</div>
			</div>

			{/* Table section skeleton */}
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-10 w-72" />
				</div>
				<div className="rounded-lg border">
					<div className="p-4 space-y-3">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
				</div>
			</div>
		</div>
	);
}
