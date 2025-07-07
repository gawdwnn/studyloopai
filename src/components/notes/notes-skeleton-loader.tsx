import { Skeleton } from "@/components/ui/skeleton";

export function NotesSkeletonLoader() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-8 w-full" />
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				{Array.from({ length: 4 }, (_, index) => `skeleton-${index}`).map((key) => (
					<div key={key} className="space-y-2">
						<Skeleton className="h-6 w-3/4" />
						<Skeleton className="h-20 w-full" />
					</div>
				))}
			</div>
		</div>
	);
}
