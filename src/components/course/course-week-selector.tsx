"use client";

import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Course, CourseWeek } from "@/types/database-types";

interface CourseWeekSelectorProps {
	courses: Course[];
	courseWeeks: CourseWeek[];
	selectedCourseId: string | null;
	onCourseChange: (courseId: string) => void;
	selectedWeek: number | null;
	onWeekChange: (week: number) => void;
	isLoading?: boolean;
	courseLabel?: string;
	weekLabel?: string;
	coursePlaceholder?: string;
	weekPlaceholder?: string;
	required?: boolean;
	showOnlyWeeksWithoutMaterials?: boolean;
}

export function CourseWeekSelector({
	courses,
	courseWeeks,
	selectedCourseId,
	onCourseChange,
	selectedWeek,
	onWeekChange,
	isLoading = false,
	courseLabel = "Select Course",
	weekLabel = "Select Week",
	coursePlaceholder = "Select a course...",
	weekPlaceholder = "Select a week...",
	required = false,
	showOnlyWeeksWithoutMaterials = false,
}: CourseWeekSelectorProps) {
	const availableWeeks = courseWeeks.filter(
		(week) => {
			if (week.courseId !== selectedCourseId) return false;
			
			if (showOnlyWeeksWithoutMaterials) {
				return !week.hasMaterials;
			}
			
			return true;
		}
	);

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
			{/* Course Selection */}
			<div className="space-y-2">
				<Label htmlFor="course-select" className="text-sm font-medium">
					{courseLabel}
					{required && " *"}
				</Label>
				<Select
					value={selectedCourseId ?? ""}
					onValueChange={onCourseChange}
					disabled={isLoading || courses.length === 0}
				>
					<SelectTrigger id="course-select" className="w-full">
						<SelectValue placeholder={coursePlaceholder} />
					</SelectTrigger>
					<SelectContent>
						{courses.map((course) => (
							<SelectItem key={course.id} value={course.id}>
								<span className="truncate">{course.name}</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{courses.length === 0 && !isLoading && (
					<p className="text-xs text-muted-foreground">
						You don't have any courses yet. Create one to get started.
					</p>
				)}
			</div>

			{/* Week Selection */}
			<div className="space-y-2">
				<Label htmlFor="week-select" className="text-sm font-medium">
					{weekLabel}
					{required && " *"}
				</Label>
				<Select
					value={selectedWeek?.toString() ?? ""}
					onValueChange={(value) => onWeekChange(Number.parseInt(value, 10))}
					disabled={!selectedCourseId || isLoading || availableWeeks.length === 0}
				>
					<SelectTrigger id="week-select" className="w-full">
						<SelectValue placeholder={weekPlaceholder} />
					</SelectTrigger>
					<SelectContent>
						{availableWeeks.map((week) => (
							<SelectItem key={week.id} value={week.weekNumber.toString()}>
								{week.title}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{!selectedCourseId && (
					<p className="text-xs text-muted-foreground">Select a course first to choose a week</p>
				)}
				{selectedCourseId && availableWeeks.length === 0 && (
					<p className="text-xs text-muted-foreground">
						All weeks for this course already have materials uploaded
					</p>
				)}
			</div>
		</div>
	);
}
