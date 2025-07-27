"use client";

import { CourseWeekSelector } from "@/components/course/course-week-selector";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getCourseWeeks } from "@/lib/actions/courses";
import { useUploadWizardStore } from "@/stores/upload-wizard-store";
import type { Course } from "@/types/database-types";
import { useQuery } from "@tanstack/react-query";

interface StepCourseSelectionProps {
	courses: Course[];
}

export function StepCourseSelection({ courses }: StepCourseSelectionProps) {
	const { selectedCourseId, selectedWeekNumber, setCourseSelection } =
		useUploadWizardStore();

	const { data: courseWeeks = [], isLoading: isLoadingWeeks } = useQuery({
		queryKey: ["course-weeks", selectedCourseId],
		queryFn: () => getCourseWeeks(selectedCourseId),
		enabled: !!selectedCourseId,
	});

	const handleCourseChange = (courseId: string) => {
		setCourseSelection(courseId, "", 0);
	};

	const handleWeekChange = (weekNumber: number) => {
		const selectedWeek = courseWeeks.find(
			(week) =>
				week.courseId === selectedCourseId && week.weekNumber === weekNumber
		);

		if (selectedWeek) {
			setCourseSelection(selectedCourseId, selectedWeek.id, weekNumber);
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<CardTitle>Select Course & Week</CardTitle>
				</div>
				<CardDescription>
					Choose the course and week where you want to upload materials
				</CardDescription>
			</CardHeader>
			<CardContent>
				<CourseWeekSelector
					courses={courses}
					courseWeeks={courseWeeks}
					selectedCourseId={selectedCourseId}
					onCourseChange={handleCourseChange}
					selectedWeek={selectedWeekNumber}
					onWeekChange={handleWeekChange}
					isLoading={isLoadingWeeks}
					courseLabel="Course"
					weekLabel="Week"
					required={true}
					showOnlyWeeksWithoutMaterials={false}
				/>
			</CardContent>
		</Card>
	);
}
