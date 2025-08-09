"use client";

import {
	GeneratingButton,
	LoadingButton,
	StartingButton,
} from "@/components/adaptive-loading-button";
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

	const cuecardUIState: CuecardUIState = useMemo(() => {
		if (combinedLoadingAvailability || !selectedCourse) return "loading";

		const isAllWeeksSelected = selectedWeek === "all-weeks";
		const hasExistingContent = existingCuecardsData.isAvailable;
		const hasUploadedMaterials = existingCuecardsData.hasCourseWeeksWithContent;
		const canGenerateForWeek =
			generationHistoryData && !generationHistoryData.cuecards.generated;

		if (hasExistingContent) return "ready-to-start";
		if (isAllWeeksSelected && !hasExistingContent) return "needs-specific-week";
		if (!isAllWeeksSelected && hasUploadedMaterials && canGenerateForWeek)
			return "can-generate";
		if (!hasUploadedMaterials) return "needs-materials";

		return "cannot-generate";
	}, [
		combinedLoadingAvailability,
		selectedCourse,
		selectedWeek,
		existingCuecardsData.isAvailable,
		existingCuecardsData.hasCourseWeeksWithContent,
		generationHistoryData,
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

	// State-based action configuration
	type StateActionConfig = {
		action: () => Promise<void>;
		canExecute: boolean;
	};

	const stateActionConfigs: Record<CuecardUIState, StateActionConfig> = useMemo(
		() => ({
			loading: {
				action: async () => {},
				canExecute: false,
			},
			"ready-to-start": {
				action: async () => {
					const isAllWeeksSelected = selectedWeek === "all-weeks";
					const config: CuecardConfig = {
						courseId: selectedCourse,
						weeks: isAllWeeksSelected ? [] : [selectedWeek],
					};
					try {
						await existingCuecardsData.startSessionInstantly(config);
						toast.success("Cuecard session started!");
					} catch (error) {
						logger.error("Failed to start cuecard session", {
							message: error instanceof Error ? error.message : String(error),
							stack: error instanceof Error ? error.stack : undefined,
							sessionConfig: config,
						});
						toast.error("Failed to start session. Please try again.");
					}
				},
				canExecute: true,
			},
			"can-generate": {
				action: async () => {
					if (!onTriggerGeneration) return;
					try {
						const cuecardConfig: SelectiveGenerationConfig = {
							selectedFeatures: { cuecards: true },
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
				},
				canExecute: true,
			},
			"needs-materials": {
				action: async () => {},
				canExecute: false,
			},
			"needs-specific-week": {
				action: async () => {},
				canExecute: false,
			},
			"cannot-generate": {
				action: async () => {},
				canExecute: false,
			},
		}),
		[
			selectedCourse,
			selectedWeek,
			existingCuecardsData,
			onTriggerGeneration,
			generationConfig,
		]
	);

	const handleStartSession = async () => {
		if (!selectedCourse) return;

		const actionConfig = stateActionConfigs[cuecardUIState];
		if (actionConfig.canExecute) {
			// Set loading state for better UX
			if (cuecardUIState === "ready-to-start") {
				setIsStarting(true);
			}

			try {
				await actionConfig.action();
			} finally {
				if (cuecardUIState === "ready-to-start") {
					setIsStarting(false);
				}
			}
		}
	};

	// Session starting state for better UX
	const [isStarting, setIsStarting] = useState(false);

	// Enhanced state-based button configuration
	const buttonState = useMemo(() => {
		// Override state during generation
		if (showGenerationProgress) {
			return {
				type: "generating" as const,
				disabled: true,
				text: "Generating...",
				icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" />,
				variant: "default" as const,
			};
		}

		// Map UI state to button configuration
		switch (cuecardUIState) {
			case "loading":
				return {
					type: "loading" as const,
					disabled: true,
					text: selectedCourse ? "Checking Content..." : "Select a Course",
					icon: selectedCourse ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : undefined,
					variant: "default" as const,
				};
			case "ready-to-start":
				return {
					type: "start" as const,
					disabled: false,
					text: "Start Session",
					icon: <PlayCircle className="mr-2 h-4 w-4" />,
					variant: "default" as const,
				};
			case "can-generate":
				return {
					type: "generate" as const,
					disabled: false,
					text: "Generate & Start Session",
					icon: <Sparkles className="mr-2 h-4 w-4" />,
					variant: "default" as const,
				};
			case "needs-materials":
				return {
					type: "disabled" as const,
					disabled: true,
					text: "Upload Course Materials First",
					variant: "secondary" as const,
				};
			case "needs-specific-week":
				return {
					type: "disabled" as const,
					disabled: true,
					text: "Select Specific Week",
					variant: "secondary" as const,
				};
			case "cannot-generate":
				return {
					type: "disabled" as const,
					disabled: true,
					text: "Cannot Generate",
					variant: "secondary" as const,
				};
			default:
				return {
					type: "disabled" as const,
					disabled: true,
					text: "Unknown State",
					variant: "secondary" as const,
				};
		}
	}, [cuecardUIState, selectedCourse, showGenerationProgress]);

	// Show generation settings based on UI state
	const showGenerationSettings = cuecardUIState === "can-generate";

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
								{combinedLoadingAvailability ? (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Loader2 className="h-4 w-4 animate-spin" />
										<span>Checking content...</span>
									</div>
								) : existingCuecardsData.isAvailable ? (
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
									) : (
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
									)
								) : (
									<div className="space-y-2">
										{selectedWeek === "all-weeks" ? (
											<div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
												<Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
												<div className="text-sm">
													<p className="font-medium text-blue-900 dark:text-blue-100">
														Select Week for Generation
													</p>
													<p className="text-blue-700 dark:text-blue-300 mt-1">
														Choose a specific week with uploaded course
														materials to generate and practice cuecards.
													</p>
												</div>
											</div>
										) : (
											<div
												className={`flex items-start gap-3 p-3 rounded-lg border ${
													existingCuecardsData.hasCourseWeeksWithContent
														? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
														: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
												}`}
											>
												{existingCuecardsData.hasCourseWeeksWithContent ? (
													<Zap className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
												) : (
													<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
												)}
												<div className="text-sm">
													{existingCuecardsData.hasCourseWeeksWithContent ? (
														<>
															<p className="font-medium text-orange-900 dark:text-orange-100">
																Generate Cuecards
															</p>
															<p className="text-orange-700 dark:text-orange-300 mt-1">
																Ready to generate cuecards from your uploaded
																course materials
															</p>
														</>
													) : (
														<>
															<p className="font-medium text-red-900 dark:text-red-100">
																No Materials Available
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
														</>
													)}
												</div>
											</div>
										)}
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

							{/* Render different button types based on action */}
							{buttonState.type === "generate" ? (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<GeneratingButton
												isGenerating={showGenerationProgress}
												className="w-full h-14 text-lg"
												onClick={handleStartSession}
												disabled={buttonState.disabled}
												variant={buttonState.variant || "default"}
											>
												{buttonState.icon}
												{buttonState.text}
											</GeneratingButton>
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
							) : buttonState.type === "start" ? (
								<StartingButton
									isStarting={isStarting}
									className="w-full h-14 text-lg"
									onClick={handleStartSession}
									disabled={buttonState.disabled || isStarting}
									variant={buttonState.variant || "default"}
								>
									{buttonState.icon}
									{buttonState.text}
								</StartingButton>
							) : buttonState.type === "loading" ? (
								<LoadingButton
									isLoading={true}
									className="w-full h-14 text-lg"
									disabled={true}
									variant={buttonState.variant || "default"}
									loadingText={buttonState.text}
								>
									{buttonState.text}
								</LoadingButton>
							) : (
								<Button
									className="w-full h-14 text-lg"
									onClick={handleStartSession}
									disabled={buttonState.disabled}
									variant={buttonState.variant || "default"}
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
