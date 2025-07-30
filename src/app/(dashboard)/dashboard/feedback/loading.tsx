import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40 p-4 sm:p-6">
			<div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
				{/* Header skeleton */}
				<div className="text-center space-y-4">
					<Skeleton className="h-10 w-40 mx-auto" />
					<Skeleton className="h-8 w-80 mx-auto" />
					<Skeleton className="h-6 w-96 mx-auto" />
				</div>

				{/* Stats skeleton */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{Array.from({ length: 4 }, (_, i) => (
						<Card key={`stats-${i + 1}`}>
							<CardContent className="p-4 sm:p-6">
								<Skeleton className="h-16 w-full" />
							</CardContent>
						</Card>
					))}
				</div>

				{/* Charts skeleton */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
					{Array.from({ length: 4 }, (_, i) => (
						<Card key={`charts-${i + 1}`}>
							<CardContent className="p-4 sm:p-6">
								<Skeleton className="h-8 w-48 mb-4" />
								<Skeleton className="h-64 w-full" />
							</CardContent>
						</Card>
					))}
				</div>

				{/* Learning gaps skeleton */}
				<Card>
					<CardContent className="p-4 sm:p-6 space-y-4">
						<Skeleton className="h-8 w-56" />
						{Array.from({ length: 3 }, (_, i) => (
							<Skeleton key={`gap-${i + 1}`} className="h-16 w-full" />
						))}
					</CardContent>
				</Card>

				{/* Action buttons skeleton */}
				<div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
					<Skeleton className="h-12 w-full sm:w-48" />
					<Skeleton className="h-12 w-full sm:w-48" />
				</div>
			</div>
		</div>
	);
}
