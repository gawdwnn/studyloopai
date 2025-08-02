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
import { logger } from "@/lib/utils/logger";
import type {
	DifficultyLevel,
	FocusType,
	McqConfig,
	PracticeMode,
} from "@/stores/mcq-session/types";
import { getDefaultMcqsConfig } from "@/types/generation-types";
import {
	AlertTriangle,
	Info,
	Loader2,
	PlayCircle,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useMCQSessionData } from "./hooks/use-mcq-session-data";

import type { MCQAvailability, UserMCQ } from "@/lib/actions/mcq";
import type { Course, CourseWeek } from "@/types/database-types";
import type { SelectiveGenerationConfig } from "@/types/generation-types";

interface McqSessionSetupProps {
	courses: Course[];
	initialData?: {
		courseId: string;
		weekIds: string[]; // Store the initial week selection for proper cache comparison
		weeks: CourseWeek[];
		mcqs: UserMCQ[];
		availability: MCQAvailability;
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

export function McqSessionSetup({
	courses,
	initialData,
	onClose,
	showWeekSelectionError = false,
	showGenerationProgress = false,
	generationProgress,
	onTriggerGeneration,
}: McqSessionSetupProps) {
	const { searchParams, setQueryState } = useQueryState();

	// Initialize state from URL, initialData, or defaults (following cuecard pattern)
	const selectedCourse =
		searchParams.get("courseId") ||
		initialData?.courseId ||
		(courses.length > 0 ? courses[0].id : "");
	const selectedWeek = searchParams.get("week") || "all-weeks";
	const numQuestions = searchParams.get("count") || "20";
	const difficulty =
		(searchParams.get("difficulty") as DifficultyLevel) || "mixed";
	const focus = (searchParams.get("focus") as FocusType) || "tailored-for-me";
	const practiceMode =
		(searchParams.get("practiceMode") as PracticeMode) || "practice";

	const [generationConfig, setGenerationConfig] =
		useState<SelectiveGenerationConfig>({
			selectedFeatures: {
				mcqs: true,
			},
			featureConfigs: {
				mcqs: getDefaultMcqsConfig(),
			},
		});

	// Optimize data fetching using initialData pattern
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

	// Use initial data when available, otherwise use fetched data
	const weeks = shouldUseInitialData ? initialData?.weeks || [] : fetchedWeeks;
	const isWeeksReady = shouldUseInitialData || !loadingWeeks;

	// Only fetch session data after weeks are ready to prevent race conditions
	const sessionData = useMCQSessionData({
		courseId: selectedCourse,
		weekIds: selectedWeek === "all-weeks" ? [] : [selectedWeek],
		enabled: Boolean(selectedCourse) && isWeeksReady,
		initialData: shouldUseInitialData
			? {
					mcqs: initialData?.mcqs || [],
					availability: initialData?.availability,
				}
			: undefined,
	});

	// Feature availability - will be filtered by isWeeksReady in combined loading
	const { data: weekFeatureAvailability, isLoading: isLoadingAvailability } =
		useFeatureAvailability(
			selectedCourse,
			selectedWeek === "all-weeks" ? null : selectedWeek
		);

	// Combine all loading states for consistent UI
	const combinedLoadingAvailability =
		!isWeeksReady || sessionData.isLoading || isLoadingAvailability;

	// Helper to get current week's feature availability
	const getCurrentWeekAvailability = useCallback(() => {
		return weekFeatureAvailability;
	}, [weekFeatureAvailability]);

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
		const isContentUnavailable = !sessionData.isAvailable;

		// Handle on-demand generation for specific weeks without existing content
		if (isContentUnavailable && !isAllWeeksSelected) {
			const weekFeature = getCurrentWeekAvailability();
			const canGenerate = weekFeature && !weekFeature.mcqs.generated;

			// Trigger generation if course materials exist but MCQs don't
			if (canGenerate && onTriggerGeneration) {
				try {
					// Create focused config for MCQ generation only
					const mcqConfig: SelectiveGenerationConfig = {
						selectedFeatures: {
							mcqs: true,
						},
						featureConfigs: {
							mcqs: generationConfig.featureConfigs.mcqs,
						},
					};

					await onTriggerGeneration(selectedCourse, [selectedWeek], mcqConfig);
				} catch (error) {
					logger.error("Failed to trigger MCQ generation from session setup", {
						message: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined,
						courseId: selectedCourse,
						weekId: selectedWeek,
						generationConfig,
					});
					toast.error("Failed to generate MCQs. Please try again.");
				}
			}
			return;
		}

		// Guard clause: button should be disabled for this case
		if (isContentUnavailable && isAllWeeksSelected) {
			return;
		}

		// Configure session based on week selection
		const config: McqConfig = {
			courseId: selectedCourse,
			weeks: isAllWeeksSelected ? [] : [selectedWeek], // Empty array means all available weeks
			difficulty: difficulty,
			focus,
			practiceMode,
			numQuestions: Number.parseInt(numQuestions),
		};

		// Start the MCQ session with existing content
		try {
			await sessionData.startSessionInstantly(config);
			toast.success("MCQ session started!");
		} catch (error) {
			logger.error("Failed to start MCQ session", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				sessionConfig: config,
				isAvailable: sessionData.isAvailable,
				mcqCount: sessionData.count,
			});
			toast.error("Failed to start session. Please try again.");
		}
	};

	// Smart button state logic
	const buttonState = useMemo(() => {
		const isAllWeeksSelected = selectedWeek === "all-weeks";
		const isContentUnavailable = !sessionData.isAvailable;

		// Disable button during generation
		if (showGenerationProgress) {
			return {
				disabled: true,
				text: "Generating...",
				icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" />,
			};
		}

		if (!selectedCourse) {
			return {
				disabled: true,
				text: "Select a Course",
			};
		}
		if (combinedLoadingAvailability) {
			return {
				disabled: true,
				text: "Checking Content...",
				icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" />,
			};
		}
		if (isContentUnavailable && !isAllWeeksSelected) {
			const weekFeature = getCurrentWeekAvailability();
			const canGenerate = weekFeature && !weekFeature.mcqs.generated;

			if (canGenerate) {
				return {
					disabled: false,
					text: "Generate & Start Session",
					icon: <Sparkles className="mr-2 h-4 w-4" />,
				};
			}

			if (!weekFeature) {
				return {
					disabled: true,
					text: "Upload Course Materials First",
					variant: "secondary" as const,
				};
			}

			return {
				disabled: true,
				text: "Cannot Generate",
				variant: "secondary" as const,
			};
		}

		if (isContentUnavailable && isAllWeeksSelected) {
			return {
				disabled: true,
				text: "Select Specific Week",
				variant: "secondary" as const,
			};
		}
		return {
			disabled: false,
			text: "Start Session",
			icon: <PlayCircle className="mr-2 h-4 w-4" />,
		};
	}, [
		selectedCourse,
		combinedLoadingAvailability,
		sessionData,
		selectedWeek,
		getCurrentWeekAvailability,
		showGenerationProgress,
	]);

	// Show generation settings only for specific weeks that need content generation
	const showGenerationSettings =
		selectedWeek !== "all-weeks" &&
		!sessionData.isAvailable &&
		!combinedLoadingAvailability;

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
					className="bg-gray-100 hover:bg-gray-200 rounded-full"
					onClick={onClose}
				>
					<X className="h-6 w-6 text-gray-600" />
				</Button>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					{/* Header */}
					<div className="text-center mb-8">
						<h1 className="text-3xl font-bold">
							Start a Multiple Choice Session
						</h1>
					</div>

					{/* Main Content */}
					<div className="bg-card rounded-lg p-6 border space-y-6">
						{showWeekSelectionError && (
							<Alert variant="destructive">
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									{weeks.length === 0
										? "No course materials found. Please upload materials to any week first."
										: "No MCQs available for the selected content. You can generate them using the button below."}
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
												Choose the course you want to practice with MCQs. You
												can generate multiple types of content for the same
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
												You can select any week with course materials. If MCQs
												don't exist yet, we'll generate them on-demand from your
												uploaded content.
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
								) : sessionData.isAvailable ? (
									selectedWeek === "all-weeks" ? (
										<div className="flex items-center gap-2 text-sm text-blue-600">
											<Info className="h-4 w-4" />
											<span>
												{sessionData.count} total MCQ
												{sessionData.count !== 1 ? "s" : ""} across{" "}
												{sessionData.availableWeeks.length} week
												{sessionData.availableWeeks.length !== 1 ? "s" : ""}
											</span>
										</div>
									) : (
										<div className="flex items-center gap-2 text-sm text-green-600">
											<PlayCircle className="h-4 w-4" />
											<span>
												{sessionData.count} MCQ
												{sessionData.count !== 1 ? "s" : ""} available
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
														materials to generate and practice MCQs.
													</p>
												</div>
											</div>
										) : (
											<div
												className={`flex items-start gap-3 p-3 rounded-lg border ${
													weekFeatureAvailability
														? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
														: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
												}`}
											>
												{weekFeatureAvailability ? (
													<Zap className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
												) : (
													<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
												)}
												<div className="text-sm">
													{weekFeatureAvailability ? (
														<>
															<p className="font-medium text-orange-900 dark:text-orange-100">
																{weekFeatureAvailability.mcqs.generated
																	? "MCQs Available"
																	: "Generate MCQs"}
															</p>
															<p className="text-orange-700 dark:text-orange-300 mt-1">
																{weekFeatureAvailability.mcqs.generated
																	? `${weekFeatureAvailability.mcqs.count} MCQs available from previous generation`
																	: "Ready to generate MCQs from your uploaded course materials"}
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
																for this week before generating MCQs.
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
								<AccordionItem value="generation" className="border rounded-lg">
									<AccordionTrigger className="px-4 py-3 hover:no-underline">
										<span className="font-medium">Generation Settings</span>
									</AccordionTrigger>
									<AccordionContent className="px-4 pb-4">
										<SelectiveGenerationSettings
											config={generationConfig}
											onConfigChange={setGenerationConfig}
											featuresFilter={["mcqs"]}
											featureAvailability={getCurrentWeekAvailability()}
											showAvailabilityStatus={
												selectedWeek !== "all-weeks" &&
												!!weekFeatureAvailability
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
								contentType="MCQs"
							/>

							{buttonState.text.includes("Generate") ? (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												className="w-full h-14 text-lg"
												onClick={handleStartSession}
												disabled={buttonState.disabled}
												variant={buttonState.variant || "default"}
											>
												{buttonState.icon}
												{buttonState.text}
											</Button>
										</TooltipTrigger>
										<TooltipContent className="max-w-xs">
											<p>
												Generate MCQs from your course materials and immediately
												start practicing. This may take a few minutes depending
												on content size.
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
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
