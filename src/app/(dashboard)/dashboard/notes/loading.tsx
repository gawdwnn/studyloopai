import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_NOTES = [
	"note-1",
	"note-2",
	"note-3",
	"note-4",
	"note-5",
	"note-6",
];

const SKELETON_WEEKS = ["week-1", "week-2", "week-3", "week-4", "week-5"];

export default function NotesLoading() {
	return (
		<div className="space-y-6">
			{/* Page Heading Skeleton */}
			<div className="space-y-2">
				<Skeleton className="h-8 w-36 sm:h-10 sm:w-44" />
				<Skeleton className="h-4 w-64 sm:h-5 sm:w-80" />
			</div>

			{/* Toolbar Skeleton */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<Skeleton className="h-10 w-full sm:w-48" />
				<Skeleton className="h-10 w-full sm:w-64" />
			</div>

			{/* Week Carousel Skeleton */}
			<div className="flex gap-2 overflow-hidden">
				{SKELETON_WEEKS.map((weekId) => (
					<div key={weekId} className="flex-shrink-0">
						<Skeleton className="h-16 w-32 rounded-lg" />
					</div>
				))}
			</div>

			{/* Main Content Card Skeleton */}
			<div className="rounded-lg border bg-card">
				{/* Card Header */}
				<div className="p-6 pb-4">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
						<Skeleton className="h-6 w-48 sm:h-7 sm:w-64" />
						<Skeleton className="h-4 w-16" />
					</div>
				</div>

				{/* Card Content */}
				<div className="px-6 pb-6">
					{/* Tabs Skeleton */}
					<div className="mb-6">
						<div className="grid w-full grid-cols-3 gap-1 rounded-md bg-muted p-1">
							<Skeleton className="h-8" />
							<Skeleton className="h-8" />
							<Skeleton className="h-8" />
						</div>
					</div>

					{/* Notes Grid Skeleton */}
					<div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
						{SKELETON_NOTES.map((noteId) => (
							<div key={noteId} className="rounded-lg border bg-card">
								<div className="p-4">
									{/* Note Header */}
									<div className="flex items-start justify-between mb-3">
										<Skeleton className="h-5 w-3/4" />
										<Skeleton className="h-8 w-8 rounded" />
									</div>

									{/* Note Content */}
									<div className="space-y-2">
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-5/6" />
										<Skeleton className="h-4 w-4/6" />
										<Skeleton className="h-4 w-3/4" />
									</div>

									{/* Note Footer */}
									<div className="flex items-center justify-between mt-4 pt-3 border-t">
										<Skeleton className="h-3 w-20" />
										<div className="flex gap-2">
											<Skeleton className="h-7 w-12" />
											<Skeleton className="h-7 w-12" />
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
