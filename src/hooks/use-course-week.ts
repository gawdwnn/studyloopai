"use client";

import { useQuery } from "@tanstack/react-query";

import { getCourseWeeks } from "@/lib/actions/courses";

const courseWeeksKeys = {
	all: ["courseWeeks"] as const,
	byCourse: (courseId: string) => [...courseWeeksKeys.all, courseId] as const,
};

export function useCourseWeeks(
	courseId: string,
	options?: {
		enabled?: boolean;
		onlyWithMaterials?: boolean;
	}
) {
	const { onlyWithMaterials = false, enabled = !!courseId } = options || {};

	return useQuery({
		queryKey: [...courseWeeksKeys.byCourse(courseId), { onlyWithMaterials }],
		queryFn: () => getCourseWeeks(courseId, { onlyWithMaterials }),
		enabled,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
}
