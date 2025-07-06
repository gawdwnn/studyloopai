"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserCoursesForNotes } from "@/lib/actions/notes";
import { BookOpen, ChevronDown } from "lucide-react";

interface Course {
	id: string;
	name: string;
	description: string | null;
	createdAt: Date;
}

interface CourseSelectorButtonProps {
	onCourseSelect: (courseId: string) => void;
	selectedCourseId?: string;
}

export function CourseSelectorButton({
	onCourseSelect,
	selectedCourseId,
}: CourseSelectorButtonProps) {
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

	const selectedCourse = courses.find((course) => course.id === selectedCourseId);

	if (isLoading) {
		return (
			<Button variant="outline" disabled>
				<BookOpen className="h-4 w-4 mr-2" />
				Loading...
				<ChevronDown className="h-4 w-4 ml-2" />
			</Button>
		);
	}

	if (error || courses.length === 0) {
		return (
			<Button variant="outline" disabled>
				<BookOpen className="h-4 w-4 mr-2" />
				{error ? "Error" : "No Courses"}
				<ChevronDown className="h-4 w-4 ml-2" />
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">
					<BookOpen className="h-4 w-4 mr-2" />
					{selectedCourse ? selectedCourse.name : "Select Course"}
					<ChevronDown className="h-4 w-4 ml-2" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-[300px]">
				{courses.map((course) => (
					<DropdownMenuItem
						key={course.id}
						onClick={() => onCourseSelect(course.id)}
						className="flex flex-col items-start gap-1 p-3"
					>
						<span className="font-medium">{course.name}</span>
						{course.description && (
							<span className="text-sm text-muted-foreground">{course.description}</span>
						)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
