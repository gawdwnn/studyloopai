import { CuecardSessionManager } from "@/components/cuecards/cuecard-session-manager";
import { getUserCourses } from "@/lib/actions/courses";

export default async function CuecardsPage() {
	// Server-side data fetching
	const courses = await getUserCourses();

	return <CuecardSessionManager courses={courses} />;
}
