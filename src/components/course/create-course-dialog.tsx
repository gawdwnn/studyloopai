"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";

import { CourseCreationForm } from "@/components/course/course-creation-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { createCourse } from "@/lib/actions/courses";
import type { CourseCreationData } from "@/lib/validation/courses";

interface CreateCourseDialogProps {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
}

export function CreateCourseDialog({
	isOpen,
	onOpenChange,
}: CreateCourseDialogProps) {
	const queryClient = useQueryClient();
	const [isPending, startTransition] = useTransition();

	const handleCreateCourse = (data: CourseCreationData) => {
		startTransition(async () => {
			try {
				await createCourse(data);
				toast.success("Course created successfully!");
				await queryClient.invalidateQueries({ queryKey: ["user-courses"] });
				onOpenChange(false);
			} catch (_error) {
				toast.error("Failed to create course. Please try again.");
			}
		});
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button>Create New Course</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Create a New Course</DialogTitle>
					<DialogDescription>
						Set up a new course to organize your study materials. Click create
						when you're done.
					</DialogDescription>
				</DialogHeader>
				<CourseCreationForm
					onSubmit={handleCreateCourse}
					isPending={isPending}
				/>
			</DialogContent>
		</Dialog>
	);
}
