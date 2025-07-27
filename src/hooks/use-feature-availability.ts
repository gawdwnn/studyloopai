import {
	type WeekFeatureAvailability,
	getFeatureAvailability,
} from "@/lib/actions/course-week-features";
import { useQuery } from "@tanstack/react-query";

/**
 * Custom hook for fetching feature availability data for a course
 * Provides centralized caching, error handling, and automatic refetching
 */
export function useFeatureAvailability(courseId: string | null) {
	return useQuery({
		queryKey: ["feature-availability", courseId],
		queryFn: () => {
			if (!courseId) {
				throw new Error("Course ID is required");
			}
			return getFeatureAvailability(courseId);
		},
		enabled: !!courseId,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
	});
}

/**
 * Helper hook to get feature availability for a specific week
 */
export function useWeekFeatureAvailability(
	courseId: string | null,
	weekId: string | null
) {
	const { data: courseAvailability, ...query } =
		useFeatureAvailability(courseId);

	const weekAvailability: WeekFeatureAvailability | null =
		courseAvailability && weekId ? courseAvailability[weekId] || null : null;

	return {
		...query,
		data: weekAvailability,
	};
}
