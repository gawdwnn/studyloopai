import { getStatusTrackingData } from "@/lib/actions/course-week-features";
import { useQuery } from "@tanstack/react-query";

/**
 * Comprehensive hook for status tracking of both course materials and week features
 * Fetches data from both courseMaterials and courseWeekFeatures tables
 * Used as fallback data when realtime tracking is not available
 */
export function useStatusTracking(
	courseId: string,
	weekId: string,
	materialId: string
) {
	return useQuery({
		queryKey: ["status-tracking", courseId, weekId, materialId],
		queryFn: async () => {
			return await getStatusTrackingData(courseId, weekId, materialId);
		},
		enabled: Boolean(courseId && weekId && materialId),
		staleTime: 1000 * 60 * 2, // 2 minutes - shorter than feature availability for faster status updates
		gcTime: 1000 * 60 * 5, // 5 minutes garbage collection
	});
}
