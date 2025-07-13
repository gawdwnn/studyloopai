import { McqSessionManager } from "@/components/multiple-choice/mcq-session-manager";
import { getUserCourses } from "@/lib/actions/courses";

export default async function MultipleChoicePage() {
	// Server-side data fetching
	const courses = await getUserCourses();

	return <McqSessionManager courses={courses} />;
}
