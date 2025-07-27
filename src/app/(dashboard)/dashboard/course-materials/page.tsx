"use client";

import { deleteCourseMaterial } from "@/lib/actions/course-materials";
import { getAllUserMaterials, getUserCourses } from "@/lib/actions/courses";
import { useCourseMaterialProcessingCleanup } from "@/stores/course-material-processing-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, FilePlus2, FileX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { CourseMaterialsSkeletonLoader } from "@/components/course/course-materials-skeleton-loader";
import { CourseMaterialsTable } from "@/components/course/course-materials-table";
import { UploadWizard } from "@/components/course/upload-wizard";
import { Button } from "@/components/ui/button";
import { handleApiError, shouldShowRetry } from "@/lib/utils/error-handling";

export default function CourseMaterialsPage() {
	const [isPending, startTransition] = useTransition();
	const [deletingMaterials, setDeletingMaterials] = useState<Set<string>>(
		new Set()
	);
	const queryClient = useQueryClient();
	const router = useRouter();
	const { clearExpiredJobs } = useCourseMaterialProcessingCleanup();

	const {
		data: courses = [],
		isLoading: isLoadingCourses,
		error: coursesError,
		refetch: refetchCourses,
	} = useQuery({
		queryKey: ["user-courses"],
		queryFn: () => getUserCourses(),
	});

	const {
		data: courseMaterials = [],
		refetch: refetchMaterials,
		isLoading: isLoadingMaterials,
		error: materialsError,
	} = useQuery({
		queryKey: ["all-user-materials"],
		queryFn: () => getAllUserMaterials(),
		enabled: courses.length > 0,
	});

	// Clean up expired processing jobs (older than 24 hours) on mount and every 10 minutes
	// Prevents accumulation of stale Trigger.dev job tracking data in Zustand store
	useEffect(() => {
		// Clean up on mount
		clearExpiredJobs();

		// Set up periodic cleanup every 10 minutes
		const interval = setInterval(
			() => {
				clearExpiredJobs();
			},
			10 * 60 * 1000
		);

		return () => clearInterval(interval);
	}, [clearExpiredJobs]);

	const handleUploadSuccess = () => {
		// The new row will appear and its status will be tracked in-line
		// A refetch ensures we get the new material with its runId
		refetchMaterials();
	};

	const handleDeleteMaterial = async (
		materialId: string,
		materialName: string
	) => {
		// Optimistic update: immediately mark as deleting and remove from UI
		setDeletingMaterials((prev) => new Set(prev).add(materialId));

		// Optimistically update the query cache to remove the item immediately
		queryClient.setQueryData(
			["all-user-materials"],
			(oldData: typeof courseMaterials) => {
				return oldData?.filter((material) => material.id !== materialId) || [];
			}
		);

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

				toast.error(handleApiError(error, "delete course material"));
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

	// Handle courses error state
	if (coursesError) {
		return (
			<div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center text-center">
				<AlertCircle className="h-20 w-20 text-destructive mb-6" />
				<h2 className="text-2xl font-bold tracking-tight mb-2">
					Unable to Load Courses
				</h2>
				<p className="text-muted-foreground mb-6 max-w-md">
					{handleApiError(coursesError, "load courses")}
				</p>
				{shouldShowRetry(coursesError) && (
					<Button onClick={() => refetchCourses()}>Try Again</Button>
				)}
			</div>
		);
	}

	const hasNoCourses = !isLoadingCourses && courses.length === 0;

	if (hasNoCourses) {
		return (
			<div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center text-center">
				<FilePlus2 className="h-20 w-20 text-muted-foreground mb-6" />
				<h2 className="text-2xl font-bold tracking-tight mb-2">
					Create a Course to Get Started
				</h2>
				<p className="text-muted-foreground mb-6 max-w-md">
					You need to create a course first before you can upload and manage
					your study materials.
				</p>
				<Button onClick={() => router.push("/dashboard?action=create")}>
					Create a New Course
				</Button>
			</div>
		);
	}

	if (isLoadingCourses || (courses.length > 0 && isLoadingMaterials)) {
		return <CourseMaterialsSkeletonLoader />;
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight md:text-3xl">
						Course Materials
					</h1>
					<p className="text-muted-foreground">
						Manage your uploaded course materials and generated content.
					</p>
				</div>

				<div className="w-full md:w-auto">
					<UploadWizard
						courses={courses}
						onUploadSuccess={handleUploadSuccess}
					/>
				</div>
			</div>

			{materialsError ? (
				<div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] text-center">
					<AlertCircle className="h-20 w-20 text-destructive mb-6" />
					<h2 className="text-2xl font-bold tracking-tight mb-2">
						Unable to Load Materials
					</h2>
					<p className="text-muted-foreground mb-6 max-w-md">
						{handleApiError(materialsError, "load course materials")}
					</p>
					{shouldShowRetry(materialsError) && (
						<Button onClick={() => refetchMaterials()}>Try Again</Button>
					)}
				</div>
			) : courseMaterials.length === 0 ? (
				<div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] text-center">
					<FileX className="h-20 w-20 text-muted-foreground mb-6" />
					<h2 className="text-2xl font-bold tracking-tight mb-2">
						No Materials Uploaded Yet
					</h2>
					<p className="text-muted-foreground mb-6 max-w-md">
						Upload your first course material to start generating AI-powered
						study content like notes, flashcards, and quizzes.
					</p>
					<UploadWizard
						courses={courses}
						onUploadSuccess={handleUploadSuccess}
					/>
				</div>
			) : (
				<CourseMaterialsTable
					courseMaterials={courseMaterials}
					onDeleteMaterial={handleDeleteMaterial}
					isDeleting={isPending}
					deletingMaterials={deletingMaterials}
				/>
			)}
		</div>
	);
}
