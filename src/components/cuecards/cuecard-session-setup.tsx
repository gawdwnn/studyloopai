"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getCourseWeeks, getUserCourses } from "@/lib/actions/courses";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface CuecardSessionSetupProps {
	onStartSession: (config: SessionConfig) => void;
	onClose: () => void;
}

type Course = {
	id: string;
	name: string;
	description: string | null;
};

type CourseWeek = {
	id: string;
	courseId: string;
	weekNumber: number;
	title: string | null;
};

interface SessionConfig {
	courseId: string;
	weeks: string[];
	cardCount: number;
	difficulty: string;
	focus: string;
	mode: string;
}

export function CuecardSessionSetup({ onStartSession, onClose }: CuecardSessionSetupProps) {
	const [courses, setCourses] = useState<Course[]>([]);
	const [weeks, setWeeks] = useState<CourseWeek[]>([]);
	const [selectedCourse, setSelectedCourse] = useState<string>("");
	const [selectedWeek, setSelectedWeek] = useState<string>("all-weeks");
	const [selectedMode, setSelectedMode] = useState<string>("both");
	const [cardCount, setCardCount] = useState<string>("40");
	const [difficulty, setDifficulty] = useState<string>("");
	const [focus, setFocus] = useState<string>("tailored-for-me");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadCourses = async () => {
			try {
				const userCourses = await getUserCourses();
				setCourses(userCourses);
				if (userCourses.length > 0) {
					setSelectedCourse(userCourses[0].id);
				}
			} catch (error) {
				console.error("Failed to load courses:", error);
			} finally {
				setLoading(false);
			}
		};
		loadCourses();
	}, []);

	useEffect(() => {
		const loadWeeks = async () => {
			if (selectedCourse) {
				try {
					const courseWeeks = await getCourseWeeks(selectedCourse);
					setWeeks(courseWeeks);
					setSelectedWeek("all-weeks");
				} catch (error) {
					console.error("Failed to load course weeks:", error);
				}
			}
		};
		loadWeeks();
	}, [selectedCourse]);

	const handleStartSession = () => {
		if (!selectedCourse) {
			return;
		}

		const config: SessionConfig = {
			courseId: selectedCourse,
			weeks: selectedWeek === "all-weeks" ? [] : [selectedWeek],
			cardCount: Number.parseInt(cardCount),
			difficulty: difficulty || "mixed",
			focus,
			mode: selectedMode,
		};
		onStartSession(config);
	};

	return (
		<div className="bg-background flex justify-center mt-10">
			<Card className="w-full max-w-4xl relative">
				<Button
					variant="ghost"
					size="icon"
					className="absolute top-4 right-4 z-10 bg-muted hover:bg-muted/80 rounded-full"
					onClick={onClose}
				>
					<X className="h-6 w-6 text-muted-foreground" />
				</Button>

				<CardHeader className="text-center pb-8">
					<CardTitle className="text-lg">Start a Cue card Session</CardTitle>
				</CardHeader>

				<CardContent className="px-8 space-y-6">
					{loading ? (
						<div className="text-center py-8">
							<p className="text-muted-foreground">Loading courses...</p>
						</div>
					) : (
						<>
							{/* Course Selection */}
							<div className="space-y-2">
								<Label htmlFor="course-select" className="text-sm font-medium">
									Select Course
								</Label>
								<Select value={selectedCourse} onValueChange={setSelectedCourse}>
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
								<Select value={selectedWeek} onValueChange={setSelectedWeek}>
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
							</div>
						</>
					)}

					{/* Settings Section */}
					<div className="">
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem value="settings" className="border rounded-lg">
								<AccordionTrigger className="px-4 py-3 hover:no-underline">
									<span className="font-medium">Settings</span>
								</AccordionTrigger>
								<AccordionContent className="px-4 pb-4 space-y-4">
									{/* Difficulty Selection */}
									<div className="space-y-2">
										<Select value={difficulty} onValueChange={setDifficulty}>
											<SelectTrigger className="h-12 w-full">
												<SelectValue placeholder="Select difficulty of the cards" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="easy">Easy</SelectItem>
												<SelectItem value="medium">Medium</SelectItem>
												<SelectItem value="hard">Hard</SelectItem>
												<SelectItem value="mixed">Mixed</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{/* Number of Cards */}
									<div className="space-y-2">
										<Select value={cardCount} onValueChange={setCardCount}>
											<SelectTrigger className="h-12 w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="20">20</SelectItem>
												<SelectItem value="30">30</SelectItem>
												<SelectItem value="40">40</SelectItem>
												<SelectItem value="50">50</SelectItem>
											</SelectContent>
										</Select>
										<p className="text-xs text-muted-foreground">Select the number of cards</p>
									</div>

									{/* Focus Selection */}
									<div className="space-y-2">
										<Select value={focus} onValueChange={setFocus}>
											<SelectTrigger className="h-12 w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="tailored-for-me">Tailored for me</SelectItem>
												<SelectItem value="weak-areas">Focus on weak areas</SelectItem>
												<SelectItem value="recent-content">Recent content</SelectItem>
												<SelectItem value="comprehensive">Comprehensive review</SelectItem>
											</SelectContent>
										</Select>
										<p className="text-xs text-muted-foreground">Select Focus</p>
										<p className="text-xs text-muted-foreground">
											"Tailored for me" includes cards you've struggled with and uses spaced
											repetition.
										</p>
									</div>

									{/* Card Mode Selection */}
									<div className="space-y-2">
										<Select value={selectedMode} onValueChange={setSelectedMode}>
											<SelectTrigger className="h-12 w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="keywords">Keywords only</SelectItem>
												<SelectItem value="definitions">Definitions only</SelectItem>
												<SelectItem value="both">Both keywords and definitions</SelectItem>
											</SelectContent>
										</Select>
										<p className="text-xs text-muted-foreground">Select card mode</p>
									</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</div>
				</CardContent>
				<CardFooter className="flex flex-col items-center space-y-4 pt-6">
					<p className="text-sm text-muted-foreground">
						Your session will contain {cardCount} unique cue cards
					</p>
					<div className="bg-accent/50 border border-accent rounded-lg p-4 max-w-2xl text-center">
						<p className="text-sm text-accent-foreground">
							<strong>Spaced Repetition:</strong> Cue cards use spaced repetition, prioritizing
							cards you get wrong to focus on areas you're struggling with, rather than those you've
							mastered. This helps maximize your learning efficiency.
						</p>
					</div>
					<Button
						size="lg"
						onClick={handleStartSession}
						className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
						disabled={!selectedCourse || loading}
					>
						Start
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
