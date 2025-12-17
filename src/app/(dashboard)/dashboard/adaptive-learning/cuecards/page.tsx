import { CuecardSessionManager } from "@/components/cuecards/cuecard-session-manager";
import { getCourseWeeks, getUserCourses } from "@/lib/actions/courses";
import { getUserCuecardsWithAvailability } from "@/lib/actions/cuecard";

export default async function CuecardsPage({
	searchParams,
}: {
	searchParams: Promise<{ course?: string; weeks?: string }>;
}) {
	// Server-side data fetching with optimization
	const courses = await getUserCourses();
	const resolvedSearchParams = await searchParams;

	if (courses.length === 0) {
		return <CuecardSessionManager courses={courses} initialData={null} />;
	}

	// Pre-load data for initial course (URL param or first course)
	const initialCourseId = resolvedSearchParams.course || courses[0].id;
	const initialWeekIds = resolvedSearchParams.weeks?.split(",") || [];

	let initialData = null;

	if (initialCourseId) {
		// Use Promise.all for parallel execution
		const [initialWeeks, cuecardData] = await Promise.all([
			getCourseWeeks(initialCourseId),
			getUserCuecardsWithAvailability(initialCourseId, initialWeekIds),
		]);

		initialData = {
			courseId: initialCourseId,
			weekIds: initialWeekIds,
			weeks: initialWeeks,
			cuecards: cuecardData.cards,
			availability: cuecardData.availability,
		};
	}

	return <CuecardSessionManager courses={courses} initialData={initialData} />;
}
