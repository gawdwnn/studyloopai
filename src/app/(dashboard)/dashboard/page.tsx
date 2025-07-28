import { getAllUserMaterials, getUserCourses } from "@/lib/actions/courses";

import { CreateCourseWrapper } from "@/components/course/create-course-wrapper";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { WelcomeScreen } from "@/components/dashboard/welcome-screen";
import { PageHeading } from "@/components/page-heading";
import { DashboardClient } from "./dashboard-client";

export const metadata = {
	title: "Dashboard - StudyLoop AI",
	description: "Manage your courses and track your learning progress.",
};

export default async function DashboardPage() {
	// Fetch data server-side
	const [courses, materials] = await Promise.all([
		getUserCourses(),
		getAllUserMaterials(),
	]);

	// Handle empty courses state with enhanced welcome screen
	if (courses.length === 0) {
		return <WelcomeScreen />;
	}

	// Calculate basic stats
	const totalMaterials = materials.length;
	// These would typically come from user progress data
	const completionRate = 0;
	const weeklyProgress = 0;

	// Render dashboard with courses and stats
	return (
		<div className="space-y-8">
			<PageHeading
				title="welcome 👋"
				description="Track your learning progress and manage your courses"
			>
				<CreateCourseWrapper />
			</PageHeading>

			<DashboardStats
				totalCourses={courses.length}
				totalMaterials={totalMaterials}
				completionRate={completionRate}
				weeklyProgress={weeklyProgress}
			/>

			<div className="space-y-4">
				<h2 className="text-lg sm:text-xl font-semibold">My Courses</h2>
				<DashboardClient initialCourses={courses} />
			</div>
		</div>
	);
}
