"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import type { ChartErrorProps, ChartLoadingProps } from "@/types/chart-types";
import { AlertCircle, RefreshCw } from "lucide-react";

// Chart loading skeleton component
export function ChartLoadingSkeleton({
	height = "400px",
	className,
}: ChartLoadingProps) {
	return (
		<Card className={cn("border-0", className)} style={{ height }}>
			<CardHeader>
				<div className="flex items-center gap-2">
					<Skeleton className="h-5 w-5 rounded-sm" />
					<Skeleton className="h-6 w-32" />
				</div>
				<Skeleton className="h-4 w-64" />
			</CardHeader>
			<CardContent className="h-[calc(100%-5rem)] space-y-4">
				{/* Chart area skeleton */}
				<div className="relative h-full">
					{/* Y-axis labels */}
					<div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4">
						<Skeleton className="h-3 w-8" />
						<Skeleton className="h-3 w-8" />
						<Skeleton className="h-3 w-8" />
						<Skeleton className="h-3 w-8" />
						<Skeleton className="h-3 w-8" />
					</div>

					{/* Chart content area */}
					<div className="ml-12 mr-12 h-full flex flex-col">
						{/* Legend */}
						<div className="flex justify-center gap-4 mb-4">
							<div className="flex items-center gap-2">
								<Skeleton className="h-3 w-3 rounded-sm" />
								<Skeleton className="h-3 w-16" />
							</div>
							<div className="flex items-center gap-2">
								<Skeleton className="h-3 w-3 rounded-sm" />
								<Skeleton className="h-3 w-20" />
							</div>
						</div>

						{/* Main chart area */}
						<div className="flex-1 relative">
							{/* Chart lines/bars */}
							<div className="absolute inset-0 flex items-end justify-between px-4">
								{Array.from({ length: 8 }, (_, i) => i).map((index) => (
									<div
										key={`chart-bar-${index}`}
										className="flex flex-col items-center gap-2"
									>
										<Skeleton
											className="w-8"
											style={{ height: `${Math.random() * 60 + 20}%` }}
										/>
									</div>
								))}
							</div>

							{/* Trend line overlay */}
							<div className="absolute inset-0 flex items-center">
								<Skeleton className="h-0.5 w-full" />
							</div>
						</div>

						{/* X-axis labels */}
						<div className="flex justify-between pt-4">
							{Array.from({ length: 5 }, (_, i) => i).map((index) => (
								<Skeleton key={`x-axis-${index}`} className="h-3 w-6" />
							))}
						</div>
					</div>

					{/* Right Y-axis labels */}
					<div className="absolute right-0 top-0 h-full flex flex-col justify-between py-4">
						<Skeleton className="h-3 w-8" />
						<Skeleton className="h-3 w-8" />
						<Skeleton className="h-3 w-8" />
						<Skeleton className="h-3 w-8" />
						<Skeleton className="h-3 w-8" />
					</div>
				</div>

				{/* Chart footer */}
				<div className="flex justify-center gap-6 pt-4 border-t">
					{Array.from({ length: 3 }, (_, i) => i).map((index) => (
						<div key={`footer-${index}`} className="flex items-center gap-2">
							<Skeleton className="h-3 w-3 rounded-full" />
							<Skeleton className="h-3 w-16" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

// Specific loading skeletons for different chart types
export function TimelineChartSkeleton({ className }: ChartLoadingProps) {
	return <ChartLoadingSkeleton height="700px" className={className} />;
}

// Chart error component
export function ChartError({ error, onRetry, className }: ChartErrorProps) {
	const errorMessage = typeof error === "string" ? error : error.message;

	return (
		<Card className={cn("border-0", className)}>
			<CardContent className="h-full flex items-center justify-center p-8">
				<div className="text-center space-y-4 max-w-md">
					<AlertCircle className="w-12 h-12 text-destructive mx-auto" />
					<div>
						<h3 className="text-lg font-semibold text-destructive mb-2">
							Chart Loading Failed
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							{errorMessage || "Unable to load chart data. Please try again."}
						</p>
					</div>

					{onRetry && (
						<Button
							onClick={onRetry}
							variant="outline"
							size="sm"
							className="gap-2"
						>
							<RefreshCw className="w-4 h-4" />
							Retry
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// Chart wrapper component with loading and error states
interface ChartWrapperProps {
	loading?: boolean;
	error?: Error | string | null;
	onRetry?: () => void;
	children: React.ReactNode;
	loadingComponent?: React.ReactNode;
	className?: string;
}

export function ChartWrapper({
	loading,
	error,
	onRetry,
	children,
	loadingComponent,
	className,
}: ChartWrapperProps) {
	if (loading) {
		return loadingComponent || <ChartLoadingSkeleton className={className} />;
	}

	if (error) {
		return <ChartError error={error} onRetry={onRetry} className={className} />;
	}

	return <>{children}</>;
}

// Hook for chart error boundaries
export function useChartErrorBoundary() {
	return {
		onError: (error: Error, errorInfo: React.ErrorInfo) => {
			logger.error("Chart rendering error occurred", {
				message: error.message,
				stack: error.stack,
				componentStack: errorInfo.componentStack,
			});
			// Could integrate with error reporting service here
		},
	};
}
