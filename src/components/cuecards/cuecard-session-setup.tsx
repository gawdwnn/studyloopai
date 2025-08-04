"use client";

import { SelectiveGenerationSettings } from "@/components/course/selective-generation-settings";
import { FullscreenButton } from "@/components/fullscreen-button";
import { OnDemandGenerationProgress } from "@/components/on-demand-generation-progress";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCourseWeeks } from "@/hooks/use-course-week";
import { useFeatureAvailability } from "@/hooks/use-feature-availability";
import { useQueryState } from "@/hooks/use-query-state";
import type { CuecardAvailability, UserCuecard } from "@/lib/actions/cuecard";
import { logger } from "@/lib/utils/logger";
import type { Course, CourseWeek } from "@/types/database-types";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { getDefaultCuecardsConfig } from "@/types/generation-types";
import {
	AlertTriangle,
	Info,
	Loader2,
	PlayCircle,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCuecardSessionData } from "./hooks";
import type { CuecardConfig } from "./types";

interface CuecardSessionSetupProps {
	courses: Course[];
	initialData?: {
		courseId: string;
		weekIds: string[]; // Store the initial week selection for proper cache comparison
		weeks: CourseWeek[];
		cuecards: UserCuecard[];
		availability: CuecardAvailability;
	} | null;
	onClose: () => void;
	showWeekSelectionError?: boolean;
	showGenerationProgress?: boolean;
	generationProgress?: {
		status: string;
		updatedAt?: Date;
	} | null;
	onTriggerGeneration?: (
		courseId: string,
		weekIds: string[],
		generationConfig: SelectiveGenerationConfig
	) => Promise<void>;
}

export function CuecardSessionSetup({
	courses,
	initialData,
	onClose,
	showWeekSelectionError = false,
	showGenerationProgress = false,
	generationProgress,
	onTriggerGeneration,
}: CuecardSessionSetupProps) {
	const { searchParams, setQueryState } = useQueryState();

	const selectedCourse =
		searchParams.get("courseId") ||
		initialData?.courseId ||
		(courses.length > 0 ? courses[0].id : "");
	const selectedWeek = searchParams.get("week") || "all-weeks";

	const [generationConfig, setGenerationConfig] =
		useState<SelectiveGenerationConfig>({
			selectedFeatures: {
				cuecards: true,
			},
			featureConfigs: {
				cuecards: getDefaultCuecardsConfig(),
			},
		});

	// Use pre-fetched initialData.weeks when available, otherwise fetch with hook
	// Only use initial data if BOTH course and week selection match the initial request
	const currentWeekIds = selectedWeek === "all-weeks" ? [] : [selectedWeek];
	const initialWeekIds = initialData?.weekIds || [];
	const shouldUseInitialData =
		initialData?.courseId === selectedCourse &&
		JSON.stringify(currentWeekIds.sort()) ===
			JSON.stringify(initialWeekIds.sort());

	const { data: fetchedWeeks = [], isLoading: loadingWeeks } = useCourseWeeks(
		selectedCourse,
		{
			enabled: !shouldUseInitialData,
		}
	);

	const weeks = shouldUseInitialData ? initialData?.weeks || [] : fetchedWeeks;
	const isWeeksReady = shouldUseInitialData || !loadingWeeks;

	// Existing cuecards data - checks database for ready-to-use cuecards
	const existingCuecardsData = useCuecardSessionData({
		courseId: selectedCourse,
		weekIds: selectedWeek === "all-weeks" ? [] : [selectedWeek],
		enabled: Boolean(selectedCourse) && isWeeksReady,
		initialData: shouldUseInitialData
			? {
					cuecards: initialData?.cuecards || [],
					availability: initialData?.availability,
				}
			: undefined,
	});

	// Generation history data - tracks feature generation status and history
	const { data: generationHistoryData, isLoading: isLoadingAvailability } =
		useFeatureAvailability(
			selectedCourse,
			selectedWeek === "all-weeks" ? null : selectedWeek
		);

	// Extract explicit boolean flags based on data source
	const hasExistingCuecards = existingCuecardsData.isAvailable;
	const hasUploadedMaterials = existingCuecardsData.hasCourseWeeksWithContent;
	const hasGenerationHistory =
		generationHistoryData?.cuecards.generated ?? false;
	const existingCuecardsCount = existingCuecardsData.count;
	const generatedCuecardsCount = generationHistoryData?.cuecards.count ?? 0;

	// Combine all loading states for consistent UI
	const combinedLoadingAvailability =
		!isWeeksReady || existingCuecardsData.isLoading || isLoadingAvailability;

	// Define all possible UI states for cleaner conditional logic
	type CuecardUIState =
		| "loading"
		| "ready-to-start" // Has existing cuecards
		| "can-generate" // Has materials, no cuecards
		| "needs-materials" // No materials uploaded
		| "needs-specific-week" // All weeks selected
		| "cannot-generate"; // Error state

	// Computed state replaces complex nested conditionals
	const cuecardUIState = useMemo((): CuecardUIState => {
		if (combinedLoadingAvailability) return "loading";
		if (hasExistingCuecards) return "ready-to-start";

		const isAllWeeksSelected = selectedWeek === "all-weeks";
		if (isAllWeeksSelected) return "needs-specific-week";

		if (!hasUploadedMaterials) return "needs-materials";
		if (hasUploadedMaterials && !hasGenerationHistory) return "can-generate";

		return "cannot-generate";
	}, [
		combinedLoadingAvailability,
		hasExistingCuecards,
		selectedWeek,
		hasUploadedMaterials,
		hasGenerationHistory,
	]);

	// Reset to "all-weeks" if selected week no longer exists (only after weeks are fully loaded)
	useEffect(() => {
		if (
			isWeeksReady &&
			weeks.length > 0 &&
			selectedWeek !== "all-weeks" &&
			!weeks.some((w) => w.id === selectedWeek)
		) {
			setQueryState({ week: "all-weeks" });
		}
	}, [weeks, selectedWeek, isWeeksReady, setQueryState]);

	const handleStartSession = async () => {
		if (!selectedCourse) return;

		const isAllWeeksSelected = selectedWeek === "all-weeks";
		const isContentUnavailable = !existingCuecardsData.isAvailable;

		// Handle on-demand generation for specific weeks without existing content
		if (isContentUnavailable && !isAllWeeksSelected) {
			const weekFeature = generationHistoryData;
			const canGenerate = weekFeature && !weekFeature.cuecards.generated;

			// Trigger generation if course materials exist but cuecards don't
			if (canGenerate && onTriggerGeneration) {
				try {
					// Create focused config for cuecard generation only
					const cuecardConfig: SelectiveGenerationConfig = {
						selectedFeatures: {
							cuecards: true,
						},
						featureConfigs: {
							cuecards: generationConfig.featureConfigs.cuecards,
						},
					};

					await onTriggerGeneration(
						selectedCourse,
						[selectedWeek],
						cuecardConfig
					);
				} catch (error) {
					logger.error(
						"Failed to trigger cuecard generation from session setup",
						{
							message: error instanceof Error ? error.message : String(error),
							stack: error instanceof Error ? error.stack : undefined,
							courseId: selectedCourse,
							weekId: selectedWeek,
							generationConfig,
						}
					);
					toast.error("Failed to generate cuecards. Please try again.");
				}
			}
			return;
		}

		// Guard clause: button should be disabled for this case
		if (isContentUnavailable && isAllWeeksSelected) {
			return;
		}

		// Configure session based on week selection
		const config: CuecardConfig = {
			courseId: selectedCourse,
			weeks: isAllWeeksSelected ? [] : [selectedWeek], // Empty array means all available weeks
		};

		// Start the cuecard session with existing content
		try {
			await existingCuecardsData.startSessionInstantly(config);
			toast.success("Cuecard session started!");
		} catch (error) {
			logger.error("Failed to start cuecard session", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				sessionConfig: config,
				isAvailable: existingCuecardsData.isAvailable,
				cuecardCount: existingCuecardsData.count,
			});
			toast.error("Failed to start session. Please try again.");
		}
	};

	// State-based button configuration - replaces complex nested conditionals
	const buttonState = useMemo(() => {
		// Special states that override UI state
		if (showGenerationProgress) {
			return {
				disabled: true,
				text: "Generating...",
				icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" />,
				variant: "default" as const,
			};
		}

		if (!selectedCourse) {
			return {
				disabled: true,
				text: "Select a Course",
				variant: "default" as const,
			};
		}

		// State-based button configuration
		const buttonConfigs: Record<
			CuecardUIState,
			{
				disabled: boolean;
				text: string;
				icon?: React.ReactNode;
				variant?: "default" | "secondary";
			}
		> = {
			loading: {
				disabled: true,
				text: "Checking Content...",
				icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" />,
				variant: "default",
			},
			"ready-to-start": {
				disabled: false,
				text: "Start Session",
				icon: <PlayCircle className="mr-2 h-4 w-4" />,
				variant: "default",
			},
			"can-generate": {
				disabled: false,
				text: "Generate & Start Session",
				icon: <Sparkles className="mr-2 h-4 w-4" />,
				variant: "default",
			},
			"needs-materials": {
				disabled: true,
				text: "Upload Course Materials First",
				variant: "secondary",
			},
			"needs-specific-week": {
				disabled: true,
				text: "Select Specific Week",
				variant: "secondary",
			},
			"cannot-generate": {
				disabled: true,
				text: "Cannot Generate",
				variant: "secondary",
			},
		};

		return buttonConfigs[cuecardUIState];
	}, [selectedCourse, cuecardUIState, showGenerationProgress]);

	// Show generation settings only when user can generate cuecards
	const showGenerationSettings = cuecardUIState === "can-generate";

	// State-based status display configuration
	const statusDisplayConfig = useMemo(() => {
		const configs: Record<
			CuecardUIState,
			{
				type: "loading" | "success" | "warning" | "error" | "info";
				icon: React.ReactNode;
				title: string;
				description: string;
				className: string;
			}
		> = {
			loading: {
				type: "loading",
				icon: <Loader2 className="h-4 w-4 animate-spin" />,
				title: "Checking content...",
				description: "Loading available cuecards and materials",
				className: "text-muted-foreground",
			},
			"ready-to-start": {
				type: "success",
				icon: <PlayCircle className="h-4 w-4" />,
				title: `${existingCuecardsCount} cuecard${existingCuecardsCount !== 1 ? "s" : ""} available`,
				description: "Ready to start your practice session",
				className: "text-green-600",
			},
			"can-generate": {
				type: "warning",
				icon: <Zap className="h-4 w-4" />,
				title: hasGenerationHistory
					? "Cuecards Available"
					: "Generate Cuecards",
				description: hasGenerationHistory
					? `${generatedCuecardsCount} cuecards available from previous generation`
					: "Ready to generate cuecards from your uploaded course materials",
				className: "text-orange-600",
			},
			"needs-materials": {
				type: "error",
				icon: <AlertTriangle className="h-4 w-4" />,
				title: "No Materials Available",
				description:
					"Please upload course materials for this week before generating cuecards",
				className: "text-red-600",
			},
			"needs-specific-week": {
				type: "info",
				icon: <Info className="h-4 w-4" />,
				title: "Select Week for Generation",
				description:
					"Choose a specific week with uploaded course materials to generate and practice cuecards",
				className: "text-blue-600",
			},
			"cannot-generate": {
				type: "error",
				icon: <AlertTriangle className="h-4 w-4" />,
				title: "Cannot Generate",
				description: "Unable to generate cuecards for the selected week",
				className: "text-red-600",
			},
		};

		return configs[cuecardUIState];
	}, [
		cuecardUIState,
		existingCuecardsCount,
		hasGenerationHistory,
		generatedCuecardsCount,
	]);

	// Helper function for status display styling
	const getStatusStyling = (
		type: "loading" | "success" | "warning" | "error" | "info"
	) => {
		const styles = {
			loading:
				"bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800",
			success:
				"bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
			warning:
				"bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
			error: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
			info: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
		};
		return styles[type];
	};

	if (courses.length === 0) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center max-w-md mx-auto px-4">
					<h2 className="text-2xl font-bold mb-4">No Courses Available</h2>
					<p className="text-muted-foreground text-lg">
						Please create a course and upload course materials to get started.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background relative">
			<div className="absolute top-4 right-4 z-10 flex gap-2">
				<FullscreenButton />
				<Button
					variant="ghost"
					size="icon"
					className="bg-background/80 hover:bg-background/90 dark:bg-background/80 dark:hover:bg-background/90 rounded-full border shadow-sm h-10 w-10"
					onClick={onClose}
				>
					<X className="h-6 w-6 text-foreground" />
				</Button>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					{/* Header */}
					<div className="text-center mb-8">
						<h1 className="text-3xl font-bold">Start a Cue Card Session</h1>
					</div>

					{/* Main Content */}
					<div className="bg-card rounded-lg p-6 border space-y-6">
						{showWeekSelectionError && (
							<Alert variant="destructive">
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									{weeks.length === 0
										? "No course materials found. Please upload materials to any week first."
										: "No cuecards available for the selected content. You can generate them using the button below."}
								</AlertDescription>
							</Alert>
						)}

						{/* Course Selection */}
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Label htmlFor="course-select" className="text-sm font-medium">
									Select Course
								</Label>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Info className="h-4 w-4 text-muted-foreground cursor-help" />
										</TooltipTrigger>
										<TooltipContent className="max-w-xs">
											<p>
												Choose the course you want to practice with cuecards.
												You can generate multiple types of content for the same
												course weeks.
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
							<Select
								value={selectedCourse}
								onValueChange={(value) => setQueryState({ courseId: value })}
								disabled={!courses || courses.length === 0}
							>
								<SelectTrigger className="h-12 w-full">
									<SelectValue placeholder="Choose a course" />
								</SelectTrigger>
								<SelectContent>
									{courses.map((course) => (
										<SelectItem key={course.id} value={course.id}>
											{course.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Week Selection */}
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Label htmlFor="week-select" className="text-sm font-medium">
									Select Week
								</Label>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Info className="h-4 w-4 text-muted-foreground cursor-help" />
										</TooltipTrigger>
										<TooltipContent className="max-w-xs">
											<p>
												You can select any week with course materials. If
												cuecards don't exist yet, we'll generate them on-demand
												from your uploaded content.
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
							<Select
								value={selectedWeek}
								onValueChange={(value) => setQueryState({ week: value })}
								disabled={!isWeeksReady || !selectedCourse}
							>
								<SelectTrigger className="h-12 w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all-weeks">All weeks selected</SelectItem>
									{weeks.map((week) => (
										<SelectItem key={week.id} value={week.id}>
											{week.title || `Week ${week.weekNumber}`}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{!isWeeksReady && (
								<p className="text-xs text-muted-foreground">
									Loading weeks...
								</p>
							)}

							<div className="mt-3">
								{/* State-based status display - replaces 94 lines of complex conditionals */}
								{cuecardUIState === "ready-to-start" &&
								selectedWeek === "all-weeks" ? (
									<div className="flex items-center gap-2 text-sm text-blue-600">
										<Info className="h-4 w-4" />
										<span>
											{existingCuecardsData.count} total cuecard
											{existingCuecardsData.count !== 1 ? "s" : ""} across{" "}
											{existingCuecardsData.availableWeeks.length} week
											{existingCuecardsData.availableWeeks.length !== 1
												? "s"
												: ""}
										</span>
									</div>
								) : cuecardUIState === "ready-to-start" ? (
									<div className="flex items-center gap-2 text-sm text-green-600">
										<PlayCircle className="h-4 w-4" />
										<span>
											{existingCuecardsData.count} cuecard
											{existingCuecardsData.count !== 1 ? "s" : ""} available
										</span>
										<Badge variant="secondary" className="text-xs">
											Ready
										</Badge>
									</div>
								) : cuecardUIState === "needs-materials" ? (
									<div
										className={`flex items-start gap-3 p-3 rounded-lg border ${getStatusStyling(statusDisplayConfig.type)}`}
									>
										{statusDisplayConfig.icon}
										<div className="text-sm">
											<p className="font-medium text-red-900 dark:text-red-100">
												{statusDisplayConfig.title}
											</p>
											<p className="text-red-700 dark:text-red-300 mt-1">
												Please{" "}
												<a
													href={"/dashboard/course-materials"}
													className="underline font-medium hover:text-red-600 dark:hover:text-red-200"
												>
													upload course materials
												</a>{" "}
												for this week before generating cuecards.
											</p>
										</div>
									</div>
								) : (
									<div
										className={`flex items-start gap-3 p-3 rounded-lg border ${getStatusStyling(statusDisplayConfig.type)}`}
									>
										{statusDisplayConfig.icon}
										<div className="text-sm">
											<p
												className={`font-medium ${statusDisplayConfig.className.replace("600", "900")} dark:${statusDisplayConfig.className.replace("600", "100")}`}
											>
												{statusDisplayConfig.title}
											</p>
											<p
												className={`${statusDisplayConfig.className.replace("600", "700")} dark:${statusDisplayConfig.className.replace("600", "300")} mt-1`}
											>
												{statusDisplayConfig.description}
											</p>
										</div>
									</div>
								)}
							</div>
						</div>

						{showGenerationSettings && (
							<Accordion type="single" collapsible className="w-full">
								<AccordionItem value="settings" className="border rounded-lg">
									<AccordionTrigger className="px-4 py-3 hover:no-underline">
										<span className="font-medium">Generation Settings</span>
									</AccordionTrigger>
									<AccordionContent className="px-4 pb-4">
										<SelectiveGenerationSettings
											config={generationConfig}
											onConfigChange={setGenerationConfig}
											featuresFilter={["cuecards"]}
											featureAvailability={generationHistoryData}
											showAvailabilityStatus={
												selectedWeek !== "all-weeks" && !!generationHistoryData
											}
										/>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						)}

						{/* Action Button */}
						<div className="pt-4 space-y-4">
							<OnDemandGenerationProgress
								isVisible={showGenerationProgress}
								progress={generationProgress}
								contentType="cuecards"
							/>

							{buttonState.text.includes("Generate") ? (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												className="w-full h-14 text-lg"
												onClick={handleStartSession}
												disabled={buttonState.disabled}
												variant={buttonState.variant}
											>
												{buttonState.icon}
												{buttonState.text}
											</Button>
										</TooltipTrigger>
										<TooltipContent className="max-w-xs">
											<p>
												Generate cuecards from your course materials and
												immediately start practicing. This may take a few
												minutes depending on content size.
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							) : (
								<Button
									className="w-full h-14 text-lg"
									onClick={handleStartSession}
									disabled={buttonState.disabled}
									variant={buttonState.variant}
								>
									{buttonState.icon}
									{buttonState.text}
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
