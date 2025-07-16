"use client";

import { useQuery } from "@tanstack/react-query";

import { getUserCourses } from "@/lib/actions/courses";

const coursesKeys = {
	all: ["courses"] as const,
};

export function useUserCourses() {
	return useQuery({
		queryKey: coursesKeys.all,
		queryFn: () => getUserCourses(),
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 15 * 60 * 1000, // 15 minutes
	});
}
