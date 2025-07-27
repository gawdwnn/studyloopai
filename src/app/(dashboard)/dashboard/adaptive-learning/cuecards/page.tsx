import { CuecardSessionManager } from "@/components/cuecards/cuecard-session-manager";
import { getCourseWeeks, getUserCourses } from "@/lib/actions/courses";
import {
	checkCuecardsAvailabilityOptimized,
	getUserCuecards,
} from "@/lib/actions/cuecard";

export default async function CuecardsPage({
	searchParams,
}: {
	searchParams: Promise<{ course?: string; weeks?: string }>;
}) {
	// Server-side data fetching with optimization
	const courses = await getUserCourses();
	const resolvedSearchParams = await searchParams;

	// Pre-load data for initial course (URL param or first course)
	const initialCourseId = resolvedSearchParams.course || courses[0]?.id;
	const initialWeekIds = resolvedSearchParams.weeks?.split(",") || [];

	let initialData = null;

	if (initialCourseId) {
		// Use Promise.all for parallel execution
		const [initialWeeks, initialCuecards, initialAvailability] =
			await Promise.all([
				getCourseWeeks(initialCourseId),
				getUserCuecards(initialCourseId, initialWeekIds),
				checkCuecardsAvailabilityOptimized(initialCourseId, initialWeekIds),
			]);

		initialData = {
			courseId: initialCourseId,
			weeks: initialWeeks,
			cuecards: initialCuecards,
			availability: initialAvailability,
		};
	}

	return <CuecardSessionManager courses={courses} initialData={initialData} />;
}
