import {
	getCourseWeekFeatureAvailability,
	getFeatureAvailability,
} from "@/lib/actions/course-week-features";
import { useQuery } from "@tanstack/react-query";

// TODO: fix server actions used in this hook
export function useFeatureAvailability(
	courseId: string | null,
	weekId: string | null
) {
	// Use the optimized single week query when both IDs are provided
	const singleWeekQuery = useQuery({
		queryKey: ["course-week-feature-availability", courseId, weekId],
		queryFn: () => {
			if (!courseId || !weekId) {
				throw new Error("Both courseId and weekId required");
			}
			return getCourseWeekFeatureAvailability(courseId, weekId);
		},
		enabled: !!(courseId && weekId),
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
	});

	// Fallback to course query when weekId is null
	const courseQuery = useQuery({
		queryKey: ["course-feature-availability", courseId],
		queryFn: () => {
			if (!courseId) {
				throw new Error("Course ID required");
			}
			return getFeatureAvailability(courseId);
		},
		enabled: !!(courseId && !weekId),
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
	});

	// Return consistent interface
	if (weekId) {
		return singleWeekQuery;
	}

	// When no weekId, return null data but preserve query state
	return {
		...courseQuery,
		data: null,
	};
}
