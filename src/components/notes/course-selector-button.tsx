"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserCourses } from "@/hooks/use-courses";
import { BookOpen, ChevronDown } from "lucide-react";

interface CourseSelectorButtonProps {
	onCourseSelect: (courseId: string) => void;
	selectedCourseId?: string;
}

export function CourseSelectorButton({
	onCourseSelect,
	selectedCourseId,
}: CourseSelectorButtonProps) {
	const { data: courses = [], isLoading, error } = useUserCourses();

	useEffect(() => {
		if (!selectedCourseId && courses.length > 0) {
			onCourseSelect(courses[0].id);
		}
	}, [selectedCourseId, courses, onCourseSelect]);

	const selectedCourse = courses.find(
		(course) => course.id === selectedCourseId
	);

	if (isLoading) {
		return <Skeleton className="h-10 w-[200px]" />;
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
							<span className="text-sm text-muted-foreground">
								{course.description}
							</span>
						)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
