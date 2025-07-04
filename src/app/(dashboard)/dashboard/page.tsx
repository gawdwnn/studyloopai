"use client";

import { CourseCard } from "@/components/course/course-card";
import { CreateCourseDialog } from "@/components/course/create-course-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteCourse, getUserCourses } from "@/lib/actions/courses";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export default function DashboardPage() {
	const [isPending, startTransition] = useTransition();
	const [deletingCourses, setDeletingCourses] = useState<Set<string>>(new Set());
	const queryClient = useQueryClient();

	const { data: courses = [], isLoading } = useQuery({
		queryKey: ["user-courses"],
		queryFn: () => getUserCourses(),
	});

	const handleDeleteCourse = async (courseId: string, courseName: string) => {
		// Optimistic update: immediately mark as deleting and remove from UI
		setDeletingCourses((prev) => new Set(prev).add(courseId));

		// Optimistically update the query cache to remove the item immediately
		queryClient.setQueryData(["user-courses"], (oldData: typeof courses) => {
			return oldData?.filter((course) => course.id !== courseId) || [];
		});

		// Show immediate feedback
		toast.info(`Deleting "${courseName}"...`, {
			duration: 2000,
		});

		startTransition(async () => {
			try {
				await deleteCourse(courseId);

				// Success: show user-friendly message
				toast.success(`"${courseName}" deleted successfully`, {
					duration: 3000,
				});
			} catch (error) {
				// Error: revert optimistic update
				queryClient.invalidateQueries({ queryKey: ["user-courses"] });

				toast.error(
					error instanceof Error ? error.message : "Failed to delete course. Please try again."
				);
			} finally {
				// Always remove from deleting state
				setDeletingCourses((prev) => {
					const newSet = new Set(prev);
					newSet.delete(courseId);
					return newSet;
				});
			}
		});
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight md:text-3xl">
							Welcome back Smart, 👋
						</h1>
						<p className="text-muted-foreground">
							Here's an overview of your courses and progress.
						</p>
					</div>
					<div className="w-full md:w-auto">
						<CreateCourseDialog />
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{[...Array(4)].map(() => (
						<Skeleton key={crypto.randomUUID()} className="w-full h-48 rounded-lg" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-12">
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div>
					{/* //TODO: Add user name*/}
					<h1 className="text-2xl font-bold tracking-tight md:text-3xl">Welcome back Smart, 👋</h1>
					<p className="text-muted-foreground">Here's an overview of your courses and progress.</p>
				</div>
				<div className="w-full md:w-auto">
					<CreateCourseDialog />
				</div>
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
					courses.map((course) => {
						const isBeingDeleted = deletingCourses.has(course.id);
						return (
							<div key={course.id} className="h-48">
								<CourseCard
									course={course}
									onDeleteCourse={handleDeleteCourse}
									isDeleting={isPending}
									isBeingDeleted={isBeingDeleted}
								/>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
