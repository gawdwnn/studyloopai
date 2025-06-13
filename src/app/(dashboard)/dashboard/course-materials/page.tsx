"use client";

import { deleteCourseMaterial } from "@/lib/actions/course-materials";
import { getAllUserMaterials, getUserCourses } from "@/lib/actions/courses";
import { useQuery } from "@tanstack/react-query";
import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { CourseMaterialUploadWizard } from "@/components/course/course-material-upload-wizard";
import { CourseMaterialsTable } from "@/components/course/course-materials-table";
import {
  ProcessingIndicator,
  useProcessingJobs,
} from "@/components/course/processing-indicator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CourseMaterialsPage() {
  const { jobs, addJob, updateJob, dismissJob } = useProcessingJobs();
  const jobIdMapRef = useRef<Map<string, string>>(new Map()); // Map wizard jobId to processing jobId
  const [isPending, startTransition] = useTransition();

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
    refetchMaterials();
  };

  const handleJobStart = (wizardJobId: string, title: string) => {
    // Add a new processing job when upload starts
    const processingJobId = addJob({
      title,
      status: "processing",
    });

    // Map the wizard job ID to the processing job ID
    jobIdMapRef.current.set(wizardJobId, processingJobId);
  };

  const handleJobUpdate = (
    wizardJobId: string,
    status: "processing" | "completed" | "failed",
    error?: string
  ) => {
    // Get the actual processing job ID
    const processingJobId = jobIdMapRef.current.get(wizardJobId);

    if (processingJobId) {
      // Update the job status
      updateJob(processingJobId, {
        status,
        ...(error && { error }),
      });

      // Clean up the mapping when job is complete
      if (status === "completed" || status === "failed") {
        jobIdMapRef.current.delete(wizardJobId);
      }
    }
  };

  const handleDeleteMaterial = async (
    materialId: string,
    materialName: string
  ) => {
    startTransition(async () => {
      try {
        await deleteCourseMaterial(materialId);
        toast.success(`"${materialName}" has been deleted successfully.`);
        refetchMaterials();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to delete course material. Please try again."
        );
      }
    });
  };

  const hasNoCourses = false;

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Course Materials
            </h1>
            <p className="text-muted-foreground">
              Manage your uploaded course materials and generated content.
            </p>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  {!hasNoCourses ? (
                    <CourseMaterialUploadWizard
                      courses={courses}
                      onUploadSuccess={handleUploadSuccess}
                      onJobStart={handleJobStart}
                      onJobUpdate={handleJobUpdate}
                    />
                  ) : (
                    <Button disabled>Upload Course Materials</Button>
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
        />
      </div>

      {/* Background Processing Indicator */}
      <ProcessingIndicator jobs={jobs} onDismiss={dismissJob} />
    </>
  );
}
