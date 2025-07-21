"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { triggerGeneration } from "@/lib/services/generation-service";
import type { FeatureType } from "@/types/generation-types";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Loader2,
	PlayCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface OnDemandGenerationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	courseId: string;
	weekId: string;
	contentTypes: FeatureType[];
	onGenerationComplete: () => void;
}

interface GenerationProgress {
	runId?: string;
	status: "idle" | "starting" | "generating" | "completed" | "error";
	progress: number;
	currentTask?: string;
	completedTasks: string[];
	error?: string;
	estimatedTimeRemaining?: number;
}

const CONTENT_TYPE_LABELS: Record<FeatureType, string> = {
	goldenNotes: "Golden Notes",
	cuecards: "Cuecards",
	mcqs: "Multiple Choice Questions",
	openQuestions: "Open Questions",
	summaries: "Summaries",
	conceptMaps: "Concept Maps",
};

const CONTENT_TYPE_ICONS: Record<FeatureType, string> = {
	goldenNotes: "📝",
	cuecards: "🃏",
	mcqs: "❓",
	openQuestions: "📋",
	summaries: "📄",
	conceptMaps: "🗺️",
};

export function OnDemandGenerationDialog({
	isOpen,
	onClose,
	courseId,
	weekId,
	contentTypes,
	onGenerationComplete,
}: OnDemandGenerationDialogProps) {
	const [progress, setProgress] = useState<GenerationProgress>({
		status: "idle",
		progress: 0,
		completedTasks: [],
	});

	const startGeneration = useCallback(async () => {
		setProgress((prev) => ({ ...prev, status: "starting", progress: 5 }));

		try {
			const result = await triggerGeneration({
				courseId,
				weekId,
				contentTypes,
			});

			setProgress((prev) => ({
				...prev,
				runId: result.runId,
				status: "generating",
				progress: 10,
				currentTask: `Generating ${contentTypes.length} content type${contentTypes.length > 1 ? "s" : ""}...`,
			}));

			// Start polling for progress updates
			pollGenerationProgress(result.runId);
		} catch (error) {
			setProgress((prev) => ({
				...prev,
				status: "error",
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			}));
		}
	}, [courseId, weekId, contentTypes]);

	const pollGenerationProgress = useCallback(
		async (_runId: string) => {
			const pollInterval = setInterval(async () => {
				try {
					const response = await fetch(
						`/api/generation/status?courseId=${courseId}&weekId=${weekId}`
					);

					if (!response.ok) {
						throw new Error("Failed to check generation status");
					}

					const status = await response.json();

					// Update progress based on status
					if (status.overallStatus === "generating") {
						// Calculate progress based on completed tasks
						const totalTasks = contentTypes.length;
						const completedCount = contentTypes.filter(
							(type) => status.contentAvailability[type]?.status === "available"
						).length;

						const progressPercentage = Math.min(
							90,
							10 + (completedCount / totalTasks) * 80
						);

						setProgress((prev) => ({
							...prev,
							progress: progressPercentage,
							currentTask:
								completedCount < totalTasks
									? `Generating content... (${completedCount}/${totalTasks} completed)`
									: "Finalizing generation...",
							completedTasks: contentTypes.filter(
								(type) =>
									status.contentAvailability[type]?.status === "available"
							),
						}));
					} else if (
						status.overallStatus === "available" ||
						status.overallStatus === "none"
					) {
						// Generation completed
						clearInterval(pollInterval);

						setProgress((prev) => ({
							...prev,
							status: "completed",
							progress: 100,
							currentTask: "Generation completed!",
							completedTasks: contentTypes,
						}));

						// Notify parent component
						setTimeout(() => {
							onGenerationComplete();
						}, 1500);
					} else if (status.overallStatus === "error") {
						// Generation failed
						clearInterval(pollInterval);

						setProgress((prev) => ({
							...prev,
							status: "error",
							error: "Generation failed. Please try again.",
						}));
					}
				} catch (error) {
					console.error("Progress polling error:", error);
					// Continue polling - this might be a temporary network issue
				}
			}, 2000); // Poll every 2 seconds

			// Clean up interval after 10 minutes (safety net)
			setTimeout(() => {
				clearInterval(pollInterval);
			}, 600000);
		},
		[courseId, weekId, contentTypes, onGenerationComplete]
	);

	const handleClose = useCallback(() => {
		if (progress.status === "generating") {
			// Don't allow closing while generating
			return;
		}

		setProgress({
			status: "idle",
			progress: 0,
			completedTasks: [],
		});
		onClose();
	}, [progress.status, onClose]);

	// Auto-start generation when dialog opens
	useEffect(() => {
		if (isOpen && progress.status === "idle") {
			startGeneration();
		}
	}, [isOpen, progress.status, startGeneration]);

	const getStatusIcon = () => {
		switch (progress.status) {
			case "starting":
			case "generating":
				return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
			case "completed":
				return <CheckCircle2 className="h-8 w-8 text-green-500" />;
			case "error":
				return <AlertCircle className="h-8 w-8 text-red-500" />;
			default:
				return <PlayCircle className="h-8 w-8 text-gray-400" />;
		}
	};

	const getStatusMessage = () => {
		switch (progress.status) {
			case "starting":
				return "Initializing generation process...";
			case "generating":
				return progress.currentTask || "Generating content...";
			case "completed":
				return "All content generated successfully!";
			case "error":
				return progress.error || "Generation failed";
			default:
				return "Ready to generate content";
		}
	};

	const getEstimatedTime = () => {
		if (progress.status === "generating") {
			const baseTimePerType = 30; // 30 seconds per content type
			const remainingTypes =
				contentTypes.length - progress.completedTasks.length;
			return remainingTypes * baseTimePerType;
		}
		return contentTypes.length * 30;
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent
				className="sm:max-w-md"
				onPointerDownOutside={(e) => {
					if (progress.status === "generating") {
						e.preventDefault();
					}
				}}
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-3">
						{getStatusIcon()}
						Generating Content
					</DialogTitle>
					<DialogDescription>{getStatusMessage()}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Progress Bar */}
					<div className="space-y-2">
						<div className="flex justify-between text-sm text-muted-foreground">
							<span>Progress</span>
							<span>{Math.round(progress.progress)}%</span>
						</div>
						<Progress value={progress.progress} className="w-full" />
					</div>

					{/* Time Estimate */}
					{(progress.status === "starting" ||
						progress.status === "generating") && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Clock className="h-4 w-4" />
							<span>
								Estimated time: ~{Math.ceil(getEstimatedTime() / 60)} minutes
							</span>
						</div>
					)}

					<Separator />

					{/* Content Types List */}
					<div className="space-y-2">
						<h4 className="text-sm font-medium">Content Types</h4>
						<div className="grid grid-cols-1 gap-2">
							{contentTypes.map((type) => {
								const isCompleted = progress.completedTasks.includes(type);
								const isInProgress =
									progress.status === "generating" &&
									!isCompleted &&
									contentTypes.indexOf(type) === progress.completedTasks.length;

								return (
									<div
										key={type}
										className={`flex items-center gap-3 p-2 rounded-md border transition-colors ${
											isCompleted
												? "bg-green-50 border-green-200 text-green-700"
												: isInProgress
													? "bg-blue-50 border-blue-200 text-blue-700"
													: "bg-gray-50 border-gray-200 text-gray-600"
										}`}
									>
										<span className="text-lg">{CONTENT_TYPE_ICONS[type]}</span>
										<span className="flex-1 text-sm font-medium">
											{CONTENT_TYPE_LABELS[type]}
										</span>
										{isCompleted && (
											<CheckCircle2 className="h-4 w-4 text-green-500" />
										)}
										{isInProgress && (
											<Loader2 className="h-4 w-4 animate-spin text-blue-500" />
										)}
									</div>
								);
							})}
						</div>
					</div>
				</div>

				<DialogFooter>
					{progress.status === "completed" ? (
						<Button onClick={handleClose} className="w-full">
							Continue to Session
						</Button>
					) : progress.status === "error" ? (
						<div className="flex gap-2 w-full">
							<Button
								variant="outline"
								onClick={handleClose}
								className="flex-1"
							>
								Cancel
							</Button>
							<Button onClick={startGeneration} className="flex-1">
								Try Again
							</Button>
						</div>
					) : (
						<Button
							variant="outline"
							onClick={handleClose}
							disabled={progress.status === "generating"}
							className="w-full"
						>
							{progress.status === "generating" ? "Generating..." : "Cancel"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
