"use client";

import { deleteCourseMaterial } from "@/lib/actions/course-materials";
import { getAllUserMaterials, getUserCourses } from "@/lib/actions/courses";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CourseMaterialUploadWizard } from "@/components/course/course-material-upload-wizard";
import { CourseMaterialsTable } from "@/components/course/course-materials-table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function CourseMaterialsPage() {
	const [isPending, startTransition] = useTransition();
	const [deletingMaterials, setDeletingMaterials] = useState<Set<string>>(new Set());
	const queryClient = useQueryClient();

	const { data: courses = [] } = useQuery({
		queryKey: ["user-courses"],
		queryFn: () => getUserCourses(),
	});

	const {
		data: courseMaterials = [],
		refetch: refetchMaterials,
		isLoading,
	} = useQuery({
		queryKey: ["all-user-materials"],
		queryFn: () => getAllUserMaterials(),
	});

	const handleUploadSuccess = () => {
		// The new row will appear and its status will be tracked in-line
		// A refetch ensures we get the new material with its runId
		refetchMaterials();
	};

	const handleDeleteMaterial = async (materialId: string, materialName: string) => {
		// Optimistic update: immediately mark as deleting and remove from UI
		setDeletingMaterials((prev) => new Set(prev).add(materialId));

		// Optimistically update the query cache to remove the item immediately
		queryClient.setQueryData(["all-user-materials"], (oldData: typeof courseMaterials) => {
			return oldData?.filter((material) => material.id !== materialId) || [];
		});

		// Show immediate feedback
		toast.info(`Deleting "${materialName}"...`, {
			duration: 2000,
		});

		startTransition(async () => {
			try {
				await deleteCourseMaterial(materialId);

				// Success: show user-friendly message
				toast.success(`"${materialName}" deleted successfully`, {
					duration: 3000,
				});
			} catch (error) {
				// Error: revert optimistic update
				queryClient.invalidateQueries({ queryKey: ["all-user-materials"] });

				toast.error(
					error instanceof Error
						? error.message
						: "Failed to delete course material. Please try again."
				);
			} finally {
				// Always remove from deleting state
				setDeletingMaterials((prev) => {
					const newSet = new Set(prev);
					newSet.delete(materialId);
					return newSet;
				});
			}
		});
	};

	const hasNoCourses = !isLoading && courses.length === 0;

	return (
		<>
			<div className="space-y-6">
				<div className="flex justify-between items-start">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Course Materials</h1>
						<p className="text-muted-foreground">
							Manage your uploaded course materials and generated content.
						</p>
					</div>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div>
									{hasNoCourses ? (
										<Button disabled>Upload Course Materials</Button>
									) : (
										<CourseMaterialUploadWizard
											courses={courses}
											onUploadSuccess={handleUploadSuccess}
										/>
									)}
								</div>
							</TooltipTrigger>
							{hasNoCourses && (
								<TooltipContent>
									<p>Create a course first to upload materials</p>
								</TooltipContent>
							)}
						</Tooltip>
					</TooltipProvider>
				</div>

				<CourseMaterialsTable
					courseMaterials={courseMaterials}
					isLoading={isLoading}
					onDeleteMaterial={handleDeleteMaterial}
					isDeleting={isPending}
					deletingMaterials={deletingMaterials}
				/>
			</div>
		</>
	);
}
