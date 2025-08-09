"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Card-based skeleton for MCQ questions
 * Matches the structure of MCQ question display
 */
export function McqSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("min-h-screen bg-background relative", className)}>
			{/* Header area with timer and progress */}
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					{/* Timer and Progress placeholders */}
					<div className="flex justify-between items-center mb-8">
						<Skeleton className="h-12 w-32" /> {/* Timer */}
						<div className="text-center space-y-1">
							<Skeleton className="h-4 w-16 mx-auto" /> {/* Progress label */}
							<Skeleton className="h-6 w-20 mx-auto" /> {/* Progress counter */}
						</div>
					</div>

					{/* Question */}
					<div className="text-center mb-12 space-y-4">
						<Skeleton className="h-8 w-full" /> {/* Question line 1 */}
						<Skeleton className="h-8 w-3/4 mx-auto" /> {/* Question line 2 */}
					</div>

					{/* Options */}
					<div className="space-y-4 mb-12">
						{[...Array(4)].map((_, index) => (
							<div
								key={index}
								className="flex items-center space-x-4 p-6 border-2 rounded-xl"
							>
								<Skeleton className="h-8 w-8 rounded-full" />{" "}
								{/* Option label */}
								<Skeleton className="h-6 flex-1" /> {/* Option text */}
							</div>
						))}
					</div>

					{/* Action button */}
					<div className="flex justify-center">
						<Skeleton className="h-14 w-48" /> {/* Next/Submit button */}
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Cuecard-specific skeleton
 * Matches the structure of cuecard display
 */
export function CuecardSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("min-h-screen bg-background relative", className)}>
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					{/* Progress header */}
					<div className="flex justify-between items-center mb-12">
						<Skeleton className="h-6 w-20" /> {/* Week info placeholder */}
						<Skeleton className="h-8 w-16" /> {/* Progress counter */}
					</div>

					{/* Main card content */}
					<div className="bg-card rounded-2xl p-12 border space-y-8">
						{/* Card type header */}
						<div className="text-center space-y-4">
							<Skeleton className="h-8 w-32 mx-auto" />{" "}
							{/* Answer/Question label */}
							{/* Card content */}
							<div className="min-h-[200px] flex items-center justify-center space-y-4">
								<div className="space-y-3 w-full max-w-3xl">
									<Skeleton className="h-6 w-full" /> {/* Content line 1 */}
									<Skeleton className="h-6 w-5/6 mx-auto" />{" "}
									{/* Content line 2 */}
									<Skeleton className="h-6 w-4/5 mx-auto" />{" "}
									{/* Content line 3 */}
								</div>
							</div>
						</div>

						{/* Input toggle placeholder */}
						<div className="flex items-center justify-center space-x-3">
							<Skeleton className="h-6 w-6" /> {/* Switch */}
							<Skeleton className="h-4 w-40" /> {/* Switch label */}
						</div>

						{/* Action buttons */}
						<div className="flex justify-center">
							<Skeleton className="h-12 w-40" />{" "}
							{/* Show answer / feedback buttons */}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Session setup skeleton
 * For configuration screens before starting sessions
 */
export function SessionSetupSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("max-w-md mx-auto space-y-6 p-6", className)}>
			{/* Header */}
			<div className="text-center space-y-2">
				<Skeleton className="h-8 w-48 mx-auto" /> {/* Title */}
				<Skeleton className="h-4 w-64 mx-auto" /> {/* Subtitle */}
			</div>

			{/* Configuration form */}
			<div className="space-y-4">
				{/* Course selection */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-16" /> {/* Label */}
					<Skeleton className="h-10 w-full" /> {/* Select dropdown */}
				</div>

				{/* Week selection */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-12" /> {/* Label */}
					<Skeleton className="h-10 w-full" /> {/* Select dropdown */}
				</div>

				{/* Additional options */}
				<div className="space-y-3">
					<Skeleton className="h-4 w-24" /> {/* Options label */}
					<div className="space-y-2">
						<div className="flex items-center space-x-2">
							<Skeleton className="h-4 w-4" /> {/* Checkbox */}
							<Skeleton className="h-4 w-32" /> {/* Checkbox label */}
						</div>
						<div className="flex items-center space-x-2">
							<Skeleton className="h-4 w-4" /> {/* Checkbox */}
							<Skeleton className="h-4 w-40" /> {/* Checkbox label */}
						</div>
					</div>
				</div>
			</div>

			{/* Start button */}
			<Skeleton className="h-12 w-full" />
		</div>
	);
}

/**
 * Generation status skeleton
 * For AI content generation progress
 */
export function GenerationSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("text-center space-y-6 p-8", className)}>
			{/* Icon/Status */}
			<div className="flex justify-center">
				<Skeleton className="h-16 w-16 rounded-full" />
			</div>

			{/* Status messages */}
			<div className="space-y-2">
				<Skeleton className="h-6 w-48 mx-auto" /> {/* Title */}
				<Skeleton className="h-4 w-64 mx-auto" /> {/* Description */}
			</div>

			{/* Progress indicators */}
			<div className="space-y-3">
				<Skeleton className="h-2 w-full rounded-full" /> {/* Progress bar */}
				<Skeleton className="h-4 w-32 mx-auto" /> {/* Progress text */}
			</div>
		</div>
	);
}

/**
 * Results view skeleton
 * For session completion and results display
 */
export function ResultsSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("max-w-4xl mx-auto space-y-8 p-6", className)}>
			{/* Header */}
			<div className="text-center space-y-4">
				<Skeleton className="h-12 w-64 mx-auto" /> {/* Title */}
				<Skeleton className="h-6 w-80 mx-auto" /> {/* Subtitle */}
			</div>

			{/* Stats grid */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{[...Array(4)].map((_, index) => (
					<div
						key={index}
						className="text-center space-y-2 p-4 border rounded-lg"
					>
						<Skeleton className="h-8 w-12 mx-auto" /> {/* Stat value */}
						<Skeleton className="h-4 w-16 mx-auto" /> {/* Stat label */}
					</div>
				))}
			</div>

			{/* Chart/Visualization area */}
			<div className="space-y-4">
				<Skeleton className="h-6 w-32" /> {/* Chart title */}
				<Skeleton className="h-64 w-full rounded-lg" /> {/* Chart area */}
			</div>

			{/* Action buttons */}
			<div className="flex justify-center gap-4">
				<Skeleton className="h-12 w-32" /> {/* Action button 1 */}
				<Skeleton className="h-12 w-32" /> {/* Action button 2 */}
			</div>
		</div>
	);
}

/**
 * Generic loading overlay for async operations
 */
export function LoadingOverlay({
	message,
	className,
}: {
	message?: string;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center justify-center p-8", className)}>
			<div className="text-center space-y-4">
				<Skeleton className="h-8 w-8 mx-auto rounded-full" />
				{message && <Skeleton className="h-4 w-32 mx-auto" />}
			</div>
		</div>
	);
}
