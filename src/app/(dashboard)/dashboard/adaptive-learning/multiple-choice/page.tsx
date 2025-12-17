import { McqSessionManager } from "@/components/mcqs/mcq-session-manager";
import { getCourseWeeks, getUserCourses } from "@/lib/actions/courses";
import { getUserMCQsWithAvailability } from "@/lib/actions/mcq";

export default async function MultipleChoicePage({
	searchParams,
}: {
	searchParams: Promise<{ course?: string; weeks?: string }>;
}) {
	// Server-side data fetching with optimization
	const courses = await getUserCourses();
	const resolvedSearchParams = await searchParams;

	if (courses.length === 0) {
		return <McqSessionManager courses={courses} initialData={null} />;
	}

	// Pre-load data for initial course (URL param or first course)
	const initialCourseId = resolvedSearchParams.course || courses[0].id;
	const initialWeekIds = resolvedSearchParams.weeks?.split(",") || [];

	let initialData = null;

	if (initialCourseId) {
		// Use Promise.all for parallel execution
		const [initialWeeks, mcqData] = await Promise.all([
			getCourseWeeks(initialCourseId),
			getUserMCQsWithAvailability(initialCourseId, initialWeekIds),
		]);

		initialData = {
			courseId: initialCourseId,
			weekIds: initialWeekIds,
			weeks: initialWeeks,
			mcqs: mcqData.mcqs,
			availability: mcqData.availability,
		};
	}

	return <McqSessionManager courses={courses} initialData={initialData} />;
}
