import { OpenQuestionSessionManager } from "@/components/open-questions/open-question-session-manager";
import { getUserCourses } from "@/lib/actions/courses";

export default async function OpenQuestionsPage() {
	// Server-side data fetching
	const courses = await getUserCourses();

	return <OpenQuestionSessionManager courses={courses} />;
}
