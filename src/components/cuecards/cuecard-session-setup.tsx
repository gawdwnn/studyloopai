"use client";

import { SelectiveGenerationSettings } from "@/components/course/selective-generation-settings";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useCourseWeeks } from "@/hooks/use-course-week";
import { useQueryState } from "@/hooks/use-query-state";
import type { CuecardAvailability, UserCuecard } from "@/lib/actions/cuecard";
import type { Course, CourseWeek } from "@/types/database-types";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { getDefaultCuecardsConfig } from "@/types/generation-types";
import {
	AlertCircle,
	AlertTriangle,
	Loader2,
	PlayCircle,
	Sparkles,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCuecardSessionData } from "./hooks/use-cuecard-session-data";
import type { CuecardConfig, CuecardMode, PracticeMode } from "./types";

interface CuecardSessionSetupProps {
	courses: Course[];
	initialData?: {
		courseId: string;
		weeks: CourseWeek[];
		cuecards: UserCuecard[];
		availability: CuecardAvailability;
	} | null;
	onClose: () => void;
	showWeekSelectionError?: boolean;
	showGenerationProgress?: boolean;
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
	onTriggerGeneration,
}: CuecardSessionSetupProps) {
	const { searchParams, setQueryState } = useQueryState();

	const selectedCourse =
		searchParams.get("courseId") ||
		initialData?.courseId ||
		(courses.length > 0 ? courses[0].id : "");
	const selectedWeek = searchParams.get("week") || "all-weeks";
	const selectedMode = (searchParams.get("mode") as CuecardMode) || "both";
	const practiceMode =
		(searchParams.get("practiceMode") as PracticeMode) || "practice";

	const [generationConfig, setGenerationConfig] =
		useState<SelectiveGenerationConfig>({
			selectedFeatures: {
				cuecards: true,
				mcqs: false,
				openQuestions: false,
				summaries: false,
				goldenNotes: false,
				conceptMaps: false,
			},
			featureConfigs: {
				cuecards: getDefaultCuecardsConfig(),
			},
		});

	// Use pre-fetched initialData.weeks when available, otherwise fetch with hook
	const shouldUseInitialData = initialData?.courseId === selectedCourse;
	const { data: fetchedWeeks = [], isLoading: loadingWeeks } =
		useCourseWeeks(selectedCourse, { 
			onlyWithMaterials: true,
			enabled: !shouldUseInitialData 
		});
	
	const weeks = shouldUseInitialData ? initialData?.weeks || [] : fetchedWeeks;

	const sessionData = useCuecardSessionData({
		courseId: selectedCourse,
		weekIds: selectedWeek === "all-weeks" ? [] : [selectedWeek],
		enabled: Boolean(selectedCourse) && !loadingWeeks,
	});

	const { isLoading: loadingAvailability } = sessionData;

	useEffect(() => {
		if (
			!loadingWeeks &&
			weeks.length > 0 &&
			selectedWeek !== "all-weeks" &&
			!weeks.some((w) => w.id === selectedWeek)
		) {
			setQueryState({ week: "all-weeks" });
		}
	}, [weeks, selectedWeek, loadingWeeks, setQueryState]);

	const handleStartSession = async () => {
		if (!selectedCourse) return;

		if (!sessionData.isAvailable && selectedWeek !== "all-weeks") {
			if (onTriggerGeneration) {
				try {
					await onTriggerGeneration(
						selectedCourse,
						[selectedWeek],
						generationConfig
					);
				} catch (error) {
					console.error("Generation failed:", error);
					toast.error("Failed to generate cuecards. Please try again.");
				}
			}
			return;
		}

		if (!sessionData.isAvailable && selectedWeek === "all-weeks") {
			if (weeks.length === 0) {
				toast.error(
					"No course materials found. Please upload materials first."
				);
			} else {
				toast.error(
					"No cuecards found. Please select a specific week to generate content."
				);
			}
			return;
		}

		const config: CuecardConfig = {
			courseId: selectedCourse,
			weeks: selectedWeek === "all-weeks" ? [] : [selectedWeek],
			practiceMode: practiceMode,
			mode: selectedMode,
		};

		if (!sessionData.cards.length) {
			toast.error("No cuecards available. Please generate content first.");
			return;
		}

		try {
			await sessionData.startSessionInstantly(config);
			toast.success("Cuecard session started!");
		} catch (error) {
			console.error("Failed to start session:", error);
			toast.error("Failed to start session. Please try again.");
		}
	};

	const buttonState = useMemo(() => {
		if (!selectedCourse) {
			return {
				disabled: true,
				text: "Select a Course",
			};
		}
		if (loadingAvailability) {
			return {
				disabled: true,
				text: "Checking Content...",
				icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" />,
			};
		}
		if (!sessionData.isAvailable && selectedWeek !== "all-weeks") {
			return {
				disabled: false,
				text: "Generate & Start Session",
				icon: <Sparkles className="mr-2 h-4 w-4" />,
			};
		}
		if (!sessionData.isAvailable && selectedWeek === "all-weeks") {
			return {
				disabled: true,
				text: "No Content Available",
				variant: "secondary" as const,
			};
		}
		return {
			disabled: false,
			text: "Start Session",
			icon: <PlayCircle className="mr-2 h-4 w-4" />,
		};
	}, [selectedCourse, loadingAvailability, sessionData, selectedWeek]);

	const showGenerationSettings =
		selectedWeek !== "all-weeks" &&
		!sessionData.isAvailable &&
		!loadingAvailability;

	if (courses.length === 0) {
		return (
			<div className="bg-background flex justify-center mt-10">
				<Card className="w-full max-w-4xl">
					<CardHeader className="text-center pb-8">
						<CardTitle className="text-lg">No Courses Available</CardTitle>
					</CardHeader>
					<CardContent className="text-center py-8">
						<p className="text-muted-foreground">
							Please create a course and upload materials to get started.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="bg-background flex justify-center mt-10">
			<Card className="w-full max-w-4xl relative">
				<Button
					variant="ghost"
					size="icon"
					className="absolute top-4 right-4 bg-muted hover:bg-muted/80 rounded-full"
					onClick={onClose}
				>
					<X className="h-6 w-6 text-muted-foreground" />
				</Button>

				<CardHeader className="text-center pb-8">
					<CardTitle className="text-lg">Start a Cue Card Session</CardTitle>
				</CardHeader>

				<CardContent className="px-8 space-y-6">
					{showWeekSelectionError && (
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>
								{weeks.length === 0 
									? "No course materials found. Please upload materials first before generating cuecards."
									: "No cuecards found for the selected weeks. Try other weeks or generate new content."
								}
							</AlertDescription>
						</Alert>
					)}

					{showGenerationProgress && (
						<Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
							<Loader2 className="h-4 w-4 animate-spin" />
							<AlertDescription>
								Generating cuecards... This may take a few minutes.
							</AlertDescription>
						</Alert>
					)}

					{/* Course Selection */}
					<div className="space-y-2">
						<Label htmlFor="course-select" className="text-sm font-medium">
							Select Course
						</Label>
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
						<Label htmlFor="week-select" className="text-sm font-medium">
							Select Week
						</Label>
						<Select
							value={selectedWeek}
							onValueChange={(value) => setQueryState({ week: value })}
							disabled={loadingWeeks || !selectedCourse}
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
						{loadingWeeks && (
							<p className="text-xs text-muted-foreground">Loading weeks...</p>
						)}

						<div className="mt-3">
							{loadingAvailability ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span>Checking content...</span>
								</div>
							) : weeks.length === 0 ? (
								<Alert variant="destructive">
									<AlertTriangle className="h-4 w-4" />
									<AlertDescription>
										No course materials found. Please{" "}
										<a 
											href={`/dashboard/course-materials/${selectedCourse}`} 
											className="underline font-medium hover:text-destructive-foreground"
										>
											upload course materials
										</a>{" "}
										first to generate cuecards.
									</AlertDescription>
								</Alert>
							) : sessionData.isAvailable ? (
								<div className="flex items-center gap-2 text-sm text-green-600">
									<PlayCircle className="h-4 w-4" />
									<span>
										{sessionData.count} cuecard
										{sessionData.count !== 1 ? "s" : ""} available
									</span>
									<Badge variant="secondary" className="text-xs">
										Ready
									</Badge>
								</div>
							) : (
								<Alert>
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>
										{selectedWeek === "all-weeks"
											? "No cuecards found. Materials are available - we can generate cuecards for you."
											: "No cuecards found for this week. We'll generate them from your uploaded materials."}
									</AlertDescription>
								</Alert>
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
									/>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					)}

					<Accordion type="single" collapsible className="w-full">
						<AccordionItem
							value="session-settings"
							className="border rounded-lg"
						>
							<AccordionTrigger className="px-4 py-3 hover:no-underline">
								<span className="font-medium">Session Settings</span>
							</AccordionTrigger>
							<AccordionContent className="px-4 pb-4 space-y-4">
								<div className="space-y-2">
									<Label className="text-sm font-medium">
										Card Display Mode
									</Label>
									<Select
										value={selectedMode}
										onValueChange={(v) => setQueryState({ mode: v })}
									>
										<SelectTrigger className="h-12 w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="both">Both Sides</SelectItem>
											<SelectItem value="term-first">Term First</SelectItem>
											<SelectItem value="definition-first">
												Definition First
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label className="text-sm font-medium">Practice Mode</Label>
									<RadioGroup
										value={practiceMode}
										onValueChange={(v) => setQueryState({ practiceMode: v })}
										className="grid grid-cols-2 gap-4"
									>
										<div>
											<RadioGroupItem
												value="practice"
												id="practice"
												className="peer sr-only"
											/>
											<Label
												htmlFor="practice"
												className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
											>
												Practice
											</Label>
										</div>
										<div>
											<RadioGroupItem
												value="exam"
												id="exam"
												className="peer sr-only"
											/>
											<Label
												htmlFor="exam"
												className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
											>
												Exam
											</Label>
										</div>
									</RadioGroup>
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</CardContent>

				<CardFooter className="px-8 pb-8">
					<Button
						className="w-full h-12"
						onClick={handleStartSession}
						disabled={buttonState.disabled}
						variant={buttonState.variant || "default"}
					>
						{buttonState.text.includes("Checking") ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							buttonState.text.includes("Generate") && (
								<Sparkles className="mr-2 h-4 w-4" />
							)
						)}
						{buttonState.text}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
