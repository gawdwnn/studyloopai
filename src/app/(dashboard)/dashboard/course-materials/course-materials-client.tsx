"use client";

import { deleteCourseMaterial } from "@/lib/actions/course-materials";
import { getAllUserMaterials } from "@/lib/actions/courses";
import { useCourseMaterialProcessingCleanup } from "@/stores/course-material-processing-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { CourseMaterialsTable } from "@/components/course/course-materials-table";
import { handleApiError } from "@/lib/utils/error-handling";
import type {
	Course,
	CourseMaterial,
	CourseWeek,
} from "@/types/database-types";

type CourseMaterialWithRelations = CourseMaterial & {
	course?: Pick<Course, "name"> | null;
	courseWeek?: Pick<CourseWeek, "weekNumber"> | null;
};

interface CourseMaterialsClientProps {
	courses: Course[];
	initialMaterials: CourseMaterialWithRelations[];
}

export function CourseMaterialsClient({
	courses: _courses,
	initialMaterials,
}: CourseMaterialsClientProps) {
	const [isPending, startTransition] = useTransition();
	const [deletingMaterials, setDeletingMaterials] = useState<Set<string>>(
		new Set()
	);
	const queryClient = useQueryClient();
	const { clearExpiredJobs } = useCourseMaterialProcessingCleanup();

	// Use initial data and enable refetching
	const {
		data: courseMaterials = initialMaterials,
		refetch: refetchMaterials,
	} = useQuery({
		queryKey: ["all-user-materials"],
		queryFn: () => getAllUserMaterials(),
		initialData: initialMaterials,
		refetchInterval: 30000, // Refetch every 30 seconds to get status updates
	});

	// Clean up expired processing jobs
	useEffect(() => {
		clearExpiredJobs();
		const interval = setInterval(
			() => {
				clearExpiredJobs();
			},
			10 * 60 * 1000
		);
		return () => clearInterval(interval);
	}, [clearExpiredJobs]);

	const handleDeleteMaterial = async (
		materialId: string,
		materialName: string
	) => {
		// Optimistic update
		setDeletingMaterials((prev) => new Set(prev).add(materialId));

		queryClient.setQueryData(
			["all-user-materials"],
			(oldData: typeof courseMaterials) => {
				return oldData?.filter((material) => material.id !== materialId) || [];
			}
		);

		toast.info(`Deleting "${materialName}"...`, {
			duration: 2000,
		});

		startTransition(async () => {
			try {
				await deleteCourseMaterial(materialId);
				toast.success(`"${materialName}" deleted successfully`, {
					duration: 3000,
				});
			} catch (error) {
				// Revert optimistic update
				queryClient.invalidateQueries({ queryKey: ["all-user-materials"] });
				toast.error(handleApiError(error, "delete course material"));
			} finally {
				setDeletingMaterials((prev) => {
					const newSet = new Set(prev);
					newSet.delete(materialId);
					return newSet;
				});
			}
		});
	};

	// Handle upload success by refetching
	useEffect(() => {
		const handleUploadSuccess = () => {
			refetchMaterials();
		};

		window.addEventListener("upload-success", handleUploadSuccess);
		return () => {
			window.removeEventListener("upload-success", handleUploadSuccess);
		};
	}, [refetchMaterials]);

	return (
		<CourseMaterialsTable
			courseMaterials={courseMaterials}
			onDeleteMaterial={handleDeleteMaterial}
			isDeleting={isPending}
			deletingMaterials={deletingMaterials}
		/>
	);
}
