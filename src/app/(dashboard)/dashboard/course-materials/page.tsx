"use client";

import { deleteCourseMaterial } from "@/lib/actions/course-materials";
import { getAllUserMaterials, getUserCourses } from "@/lib/actions/courses";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CourseMaterialUploadWizard } from "@/components/course/course-material-upload-wizard";
import { CourseMaterialsTable } from "@/components/course/course-materials-table";
import { Button } from "@/components/ui/button";

export default function CourseMaterialsPage() {
	const [isPending, startTransition] = useTransition();
	const [deletingMaterials, setDeletingMaterials] = useState<Set<string>>(new Set());
	const queryClient = useQueryClient();
	const router = useRouter();

	const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
		queryKey: ["user-courses"],
		queryFn: () => getUserCourses(),
	});

	const {
		data: courseMaterials = [],
		refetch: refetchMaterials,
		isLoading: isLoadingMaterials,
	} = useQuery({
		queryKey: ["all-user-materials"],
		queryFn: () => getAllUserMaterials(),
		enabled: courses.length > 0,
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

	const hasNoCourses = !isLoadingCourses && courses.length === 0;

	if (hasNoCourses) {
		return (
			<div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center text-center">
				<FilePlus2 className="h-20 w-20 text-muted-foreground mb-6" />
				<h2 className="text-2xl font-bold tracking-tight mb-2">Create a Course to Get Started</h2>
				<p className="text-muted-foreground mb-6 max-w-md">
					You need to create a course first before you can upload and manage your study materials.
				</p>
				<Button onClick={() => router.push("/dashboard?action=create")}>Create a New Course</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight md:text-3xl">Course Materials</h1>
					<p className="text-muted-foreground">
						Manage your uploaded course materials and generated content.
					</p>
				</div>

				<div className="w-full md:w-auto">
					<CourseMaterialUploadWizard courses={courses} onUploadSuccess={handleUploadSuccess} />
				</div>
			</div>
			<CourseMaterialsTable
				courseMaterials={courseMaterials}
				isLoading={isLoadingCourses || isLoadingMaterials}
				onDeleteMaterial={handleDeleteMaterial}
				isDeleting={isPending}
				deletingMaterials={deletingMaterials}
			/>
		</div>
	);
}
