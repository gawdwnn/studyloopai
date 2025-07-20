"use client";

import { CourseCard } from "@/components/course/course-card";
import { CreateCourseDialog } from "@/components/course/create-course-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryState } from "@/hooks/use-query-state";
import { deleteCourse, getUserCourses } from "@/lib/actions/courses";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookPlus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useCurrentUserName } from "@/hooks/use-current-user-name";

export default function DashboardPage() {
	const [isPending, startTransition] = useTransition();
	const [deletingCourses, setDeletingCourses] = useState<Set<string>>(new Set());
	const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
	const { searchParams, setQueryState } = useQueryState();
	const userName = useCurrentUserName();

	const queryClient = useQueryClient();

	const { data: courses = [], isLoading } = useQuery({
		queryKey: ["user-courses"],
		queryFn: () => getUserCourses(),
	});

	useEffect(() => {
		const action = searchParams.get("action");
		if (action === "create") {
			setCreateDialogOpen(true);
			setQueryState({ action: null });
		}
	}, [searchParams, setQueryState]);

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
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{[...Array(4)].map(() => (
						<Skeleton key={crypto.randomUUID()} className="w-full h-48 rounded-lg" />
					))}
				</div>
			</div>
		);
	}

	if (!isLoading && courses.length === 0) {
		return (
			<div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center text-center">
				<BookPlus className="h-20 w-20 text-muted-foreground mb-6" />
				<h2 className="text-2xl font-bold tracking-tight mb-2">
					You haven't created any courses yet
				</h2>
				<p className="text-muted-foreground mb-6 max-w-md">
					Get started by creating your first course to organize your study materials and track your
					progress.
				</p>
				<CreateCourseDialog isOpen={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} />
			</div>
		);
	}

	return (
		<div className="space-y-12">
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight md:text-3xl">Welcome back {userName}, 👋</h1>
					<p className="text-muted-foreground">Here's an overview of your courses and progress.</p>
				</div>
				<div className="w-full md:w-auto">
					<CreateCourseDialog isOpen={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} />
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{courses.map((course) => {
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
				})}
			</div>
		</div>
	);
}
