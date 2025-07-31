"use client";

import { FullscreenButton } from "@/components/fullscreen-button";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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
import type {
	DifficultyLevel,
	FocusType,
	OpenQuestionConfig,
	PracticeMode,
} from "@/stores/open-question-session/types";
import { XIcon } from "lucide-react";
import { useEffect } from "react";

type Course = {
	id: string;
	name: string;
	description: string | null;
};

type OpenQuestionSessionSetupProps = {
	courses: Course[];
	onStartSession: (config: OpenQuestionConfig) => void;
	onClose?: () => void;
};

export function OpenQuestionSessionSetup({
	courses,
	onStartSession,
	onClose,
}: OpenQuestionSessionSetupProps) {
	const { searchParams, setQueryState } = useQueryState();

	// Initialize state from URL or defaults
	const selectedCourse =
		searchParams.get("courseId") || (courses.length > 0 ? courses[0].id : "");
	const selectedWeek = searchParams.get("week") || "all-weeks";
	const numQuestions = searchParams.get("count") || "5";
	const difficulty =
		(searchParams.get("difficulty") as DifficultyLevel) || "mixed";
	const focus = (searchParams.get("focus") as FocusType) || "tailored-for-me";
	const practiceMode =
		(searchParams.get("practiceMode") as PracticeMode) || "practice";

	const { data: weeks = [], isLoading: loadingWeeks } =
		useCourseWeeks(selectedCourse);

	// When selectedCourse changes, if the selectedWeek is not in the new list of weeks, reset it.
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

	const handleStartSession = () => {
		if (!selectedCourse) {
			return;
		}

		const config: OpenQuestionConfig = {
			courseId: selectedCourse,
			weeks: selectedWeek === "all-weeks" ? [] : [selectedWeek],
			difficulty: difficulty,
			focus,
			practiceMode,
			numQuestions: Number.parseInt(numQuestions),
		};
		onStartSession(config);
	};

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
					<XIcon className="h-6 w-6 text-gray-600" />
				</Button>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					{/* Header */}
					<div className="text-center mb-8">
						<h1 className="text-2xl font-bold mb-2">
							Start an Open-Ended Question Session
						</h1>
						<p className="text-muted-foreground">
							Practice with written responses and detailed feedback
						</p>
					</div>

					{/* Content */}
					<div className="space-y-8">
						{courses.length === 0 ? (
							<div className="text-center py-12">
								<p className="text-muted-foreground text-lg">
									Please create a course first to start an open-ended question
									session.
								</p>
							</div>
						) : (
							<>
								{/* Course Selection */}
								<div className="bg-card rounded-lg p-6 border">
									<div className="space-y-4">
										<Label
											htmlFor="course-select"
											className="text-base font-medium"
										>
											Select Course
										</Label>
										<Select
											value={selectedCourse}
											onValueChange={(value) =>
												setQueryState({ courseId: value })
											}
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
								</div>

								{/* Week Selection */}
								<div className="bg-card rounded-lg p-6 border">
									<div className="space-y-4">
										<Label
											htmlFor="week-select"
											className="text-base font-medium"
										>
											Select Week
										</Label>
										<Select
											value={selectedWeek}
											onValueChange={(value) => setQueryState({ week: value })}
											disabled={loadingWeeks}
										>
											<SelectTrigger className="h-12 w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all-weeks">
													All weeks selected
												</SelectItem>
												{weeks.map((week) => (
													<SelectItem key={week.id} value={week.id}>
														{week.title || `Week ${week.weekNumber}`}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{loadingWeeks && (
											<p className="text-xs text-muted-foreground">
												Loading weeks...
											</p>
										)}
									</div>
								</div>
							</>
						)}

						{/* Settings Section */}
						<div className="bg-card rounded-lg border">
							<Accordion type="single" collapsible className="w-full">
								<AccordionItem value="settings" className="border-none">
									<AccordionTrigger className="px-6 py-4 hover:no-underline">
										<span className="font-medium text-base">Settings</span>
									</AccordionTrigger>
									<AccordionContent className="px-6 pb-6 space-y-6">
										{/* Difficulty Selection */}
										<div className="space-y-2">
											<Select
												value={difficulty}
												onValueChange={(value) =>
													setQueryState({ difficulty: value })
												}
											>
												<SelectTrigger className="h-12 w-full">
													<SelectValue placeholder="Select difficulty of the questions" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="easy">Easy</SelectItem>
													<SelectItem value="medium">Medium</SelectItem>
													<SelectItem value="hard">Hard</SelectItem>
													<SelectItem value="mixed">Mixed</SelectItem>
												</SelectContent>
											</Select>
										</div>

										{/* Number of Questions */}
										<div className="space-y-2">
											<Select
												value={numQuestions}
												onValueChange={(value) =>
													setQueryState({ count: value })
												}
											>
												<SelectTrigger className="h-12 w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="5">5</SelectItem>
													<SelectItem value="10">10</SelectItem>
													<SelectItem value="15">15</SelectItem>
													<SelectItem value="20">20</SelectItem>
												</SelectContent>
											</Select>
											<p className="text-xs text-muted-foreground">
												Select the number of questions
											</p>
										</div>

										{/* Focus Selection */}
										<div className="space-y-2">
											<Select
												value={focus}
												onValueChange={(value) =>
													setQueryState({ focus: value })
												}
											>
												<SelectTrigger className="h-12 w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="tailored-for-me">
														Tailored for me
													</SelectItem>
													<SelectItem value="weak-areas">
														Focus on weak areas
													</SelectItem>
													<SelectItem value="recent-content">
														Recent content
													</SelectItem>
													<SelectItem value="comprehensive">
														Comprehensive review
													</SelectItem>
												</SelectContent>
											</Select>
											<p className="text-xs text-muted-foreground">
												Select Focus
											</p>
											<p className="text-xs text-muted-foreground">
												"Tailored for me" includes unanswered exercises and ones
												you've struggled with.
											</p>
										</div>

										{/* Practice/Exam Mode */}
										<div className="space-y-4">
											<RadioGroup
												value={practiceMode}
												onValueChange={(value) =>
													setQueryState({ practiceMode: value })
												}
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
													<p className="text-xs text-muted-foreground mt-1">
														Get feedback as you go.
													</p>
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
													<p className="text-xs text-muted-foreground mt-1">
														See results at the end.
													</p>
												</div>
											</RadioGroup>
										</div>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
							{/* Start Button */}
							<div className="pt-4">
								<Button
									className="w-full h-14 text-lg"
									onClick={handleStartSession}
									disabled={courses.length === 0}
								>
									Start Session
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
