"use client";

import { CourseCard } from "@/components/course/course-card";
import { deleteCourse, getUserCourses } from "@/lib/actions/courses";
import type { Course } from "@/types/database-types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface DashboardClientProps {
	initialCourses: Course[];
}

export function DashboardClient({ initialCourses }: DashboardClientProps) {
	const [isPending, startTransition] = useTransition();
	const [deletingCourses, setDeletingCourses] = useState<Set<string>>(
		new Set()
	);
	const queryClient = useQueryClient();

	// Use initial data and enable refetching
	const { data: courses = initialCourses } = useQuery({
		queryKey: ["user-courses"],
		queryFn: () => getUserCourses(),
		initialData: initialCourses,
		refetchInterval: 60000, // Refetch every minute
	});

	const handleDeleteCourse = async (courseId: string, courseName: string) => {
		// Optimistic update
		setDeletingCourses((prev) => new Set(prev).add(courseId));

		queryClient.setQueryData(["user-courses"], (oldData: typeof courses) => {
			return oldData?.filter((course) => course.id !== courseId) || [];
		});

		toast.info(`Deleting "${courseName}"...`, {
			duration: 2000,
		});

		startTransition(async () => {
			try {
				await deleteCourse(courseId);
				toast.success(`"${courseName}" deleted successfully`, {
					duration: 3000,
				});
			} catch (error) {
				// Revert optimistic update
				queryClient.invalidateQueries({ queryKey: ["user-courses"] });
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to delete course. Please try again."
				);
			} finally {
				setDeletingCourses((prev) => {
					const newSet = new Set(prev);
					newSet.delete(courseId);
					return newSet;
				});
			}
		});
	};

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
			<AnimatePresence mode="popLayout">
				{courses.map((course, index) => {
					const isBeingDeleted = deletingCourses.has(course.id);
					return (
						<motion.div
							key={course.id}
							layout
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{
								duration: 0.3,
								delay: index * 0.05,
								layout: { duration: 0.3 },
							}}
							className="h-48"
						>
							<CourseCard
								course={course}
								onDeleteCourse={handleDeleteCourse}
								isDeleting={isPending}
								isBeingDeleted={isBeingDeleted}
							/>
						</motion.div>
					);
				})}
			</AnimatePresence>
		</div>
	);
}
