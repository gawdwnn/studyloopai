import { getFeatureAvailability } from "@/lib/actions/course-week-features";
import type { FeatureAvailability } from "@/types/generation-types";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook for fetching feature availability data
 * Uses unified server action for both single week and full course queries
 */
export function useFeatureAvailability(
	courseId: string | null,
	weekId: string | null
) {
	return useQuery({
		queryKey: ["feature-availability", courseId, weekId || "all"],
		queryFn: async () => {
			if (!courseId) {
				throw new Error("Course ID required");
			}

			// Pass weekId as undefined (not null) for full course query
			const result = await getFeatureAvailability(
				courseId,
				weekId ?? undefined
			);

			// Handle the response based on query type
			if (weekId) {
				// Single week query returns FeatureAvailability | null
				return result as FeatureAvailability | null;
			}

			// Full course query returns Record<string, FeatureAvailability>
			// But we return null to maintain existing behavior when weekId is null
			return null;
		},
		enabled: !!courseId,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
	});
}
