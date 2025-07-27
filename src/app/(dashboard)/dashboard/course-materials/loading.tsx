import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROWS = ["row-1", "row-2", "row-3", "row-4", "row-5"];

export default function CourseMaterialsLoading() {
	return (
		<div className="space-y-6">
			{/* Page Heading Skeleton */}
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48 sm:h-10 sm:w-56" />
					<Skeleton className="h-4 w-64 sm:h-5 sm:w-80" />
				</div>
				<Skeleton className="h-10 w-full md:w-40" />
			</div>

			{/* Search and Controls Skeleton */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div className="flex items-center justify-between w-full sm:w-auto">
					<Skeleton className="h-6 w-40" />
					<div className="sm:hidden flex gap-1">
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-8 w-8" />
					</div>
				</div>
				<div className="flex items-center gap-3 w-full sm:w-auto">
					<Skeleton className="h-10 w-full sm:w-72" />
					<div className="hidden sm:flex gap-1">
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-8 w-8" />
					</div>
				</div>
			</div>

			{/* Table Skeleton */}
			<div className="w-full rounded-lg border">
				<div className="relative w-full overflow-x-auto">
					<div className="w-full">
						{/* Table Header */}
						<div className="bg-muted/50 p-4">
							<div className="flex gap-4">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-16" />
							</div>
						</div>

						{/* Table Body - 5 rows */}
						{SKELETON_ROWS.map((rowId) => (
							<div
								key={rowId}
								className="border-t p-4 hover:bg-muted/50 transition-colors"
							>
								<div className="flex items-center gap-4">
									{/* Week */}
									<Skeleton className="h-4 w-16" />

									{/* Course Name */}
									<Skeleton className="h-4 w-32" />

									{/* Material Name with Icon */}
									<div className="flex items-center gap-2 flex-1">
										<Skeleton className="h-8 w-8 rounded" />
										<div className="space-y-1 flex-1">
											<Skeleton className="h-4 w-48" />
											<Skeleton className="h-3 w-24" />
										</div>
									</div>

									{/* Status */}
									<div className="flex items-center gap-2">
										<Skeleton className="h-2 w-2 rounded-full" />
										<Skeleton className="h-4 w-24" />
									</div>

									{/* Features (desktop only) */}
									<div className="hidden lg:flex gap-4">
										{[
											"notes",
											"summaries",
											"cuecards",
											"mcqs",
											"openQuestions",
											"conceptMaps",
										].map((feature) => (
											<Skeleton
												key={feature}
												className="h-8 w-8 rounded-full"
											/>
										))}
									</div>

									{/* Actions */}
									<Skeleton className="h-8 w-8" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
