import { CourseCard } from "@/components/course/course-card";
import { CreateCourseDialog } from "@/components/course/create-course-dialog";
import { getUserCourses } from "@/lib/actions/courses";
import { getServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return null;
	}

	const courses = await getUserCourses();

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-start">
				<div>
					{/* //TODO: Add user name*/}
					<h1 className="text-3xl font-bold tracking-tight">Welcome back Smart, 👋</h1>
					<p className="text-muted-foreground">Here's an overview of your courses and progress.</p>
				</div>
				<CreateCourseDialog />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{courses.length === 0 ? (
					<div className="col-span-full text-center py-12">
						<div className="text-muted-foreground">
							<h3 className="text-lg font-medium mb-2">No courses yet</h3>
							<p className="mb-4">Create your first course to get started!</p>
							<CreateCourseDialog />
						</div>
					</div>
				) : (
					courses.map((course) => <CourseCard key={course.id} course={course} />)
				)}
			</div>
		</div>
	);
}
