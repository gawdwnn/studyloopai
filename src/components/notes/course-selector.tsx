"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserCoursesForNotes } from "@/lib/actions/notes";
import { BookOpen } from "lucide-react";

interface Course {
	id: string;
	name: string;
	description: string | null;
	createdAt: Date;
}

interface CourseSelectorProps {
	onCourseSelect: (courseId: string) => void;
	selectedCourseId?: string;
}

export function CourseSelector({ onCourseSelect, selectedCourseId }: CourseSelectorProps) {
	const [courses, setCourses] = useState<Course[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchCourses = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			const userCourses = await getUserCoursesForNotes();
			setCourses(userCourses);

			// Auto-select first course if none selected
			if (!selectedCourseId && userCourses.length > 0) {
				onCourseSelect(userCourses[0].id);
			}
		} catch (err) {
			console.error("Failed to fetch courses:", err);
			setError("Failed to load courses");
			toast.error("Failed to load your courses");
		} finally {
			setIsLoading(false);
		}
	}, [selectedCourseId, onCourseSelect]);

	useEffect(() => {
		fetchCourses();
	}, [fetchCourses]);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BookOpen className="h-5 w-5" />
						Select Course
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-10 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BookOpen className="h-5 w-5" />
						Select Course
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-4">
						<p className="text-destructive mb-2">{error}</p>
						<Button variant="outline" onClick={() => window.location.reload()}>
							Try Again
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (courses.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BookOpen className="h-5 w-5" />
						No Courses Found
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-4">
						<p className="text-muted-foreground mb-2">
							You don't have any courses yet. Create a course to start taking notes.
						</p>
						<Button asChild>
							<a href="/dashboard/courses">Create Course</a>
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	const selectedCourse = courses.find((course) => course.id === selectedCourseId);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<BookOpen className="h-5 w-5" />
					Select Course
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Select value={selectedCourseId || ""} onValueChange={onCourseSelect}>
					<SelectTrigger>
						<SelectValue placeholder="Choose a course to view notes">
							{selectedCourse ? selectedCourse.name : "Choose a course"}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{courses.map((course) => (
							<SelectItem key={course.id} value={course.id}>
								<div className="flex flex-col items-start">
									<span className="font-medium">{course.name}</span>
									{course.description && (
										<span className="text-sm text-muted-foreground">{course.description}</span>
									)}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</CardContent>
		</Card>
	);
}
