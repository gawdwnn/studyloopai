"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCourseWeeks } from "@/lib/actions/courses";
import { DOCUMENT_PROCESSING_CONFIG } from "@/lib/config/document-processing";
import { COURSE_MATERIALS_BUCKET } from "@/lib/config/storage";
import type { UserPlan } from "@/lib/processing/types";
import {
	completeUpload,
	presignUpload,
} from "@/lib/services/course-material-service";
import { createClient } from "@/lib/supabase/client";
import { fetchWithErrorHandling } from "@/lib/utils/api-error-handler";
import { logger } from "@/lib/utils/logger";
import {
	findWeekById,
	weekHasMaterials,
} from "@/lib/utils/upload-wizard-utils";
import { validateSelectiveGenerationConfig } from "@/lib/validation/generation-config";
import { useCourseMaterialProcessingStore } from "@/stores/course-material-processing-store";
import { useUploadWizardStore } from "@/stores/upload-wizard-store";
import type { Course } from "@/types/database-types";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Info, Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StepCourseSelection } from "./step-course-selection";
import { StepFeatureSelection } from "./step-feature-selection";
import { StepFileUpload } from "./step-file-upload";
import { StepGenerationSettings } from "./step-generation-settings";
import { StepReviewUpload } from "./step-review-upload";

interface UploadWizardProps {
	courses: Course[];
	onUploadSuccess?: () => void;
	userPlan: UserPlan;
}

const STEP_CONFIG = {
	"course-selection": {
		title: "Course & Week",
		description: "Select where to upload materials",
	},
	"file-upload": {
		title: "Upload Files",
		description: "Add your course materials",
	},
	"feature-selection": {
		title: "Select Features",
		description: "Choose what to generate",
	},
	"generation-settings": {
		title: "Configure",
		description: "Fine-tune generation settings",
	},
	"review-and-upload": {
		title: "Review & Upload",
		description: "Confirm and start processing",
	},
};

const STEPS = Object.keys(STEP_CONFIG) as Array<keyof typeof STEP_CONFIG>;

/**
 * Renders button content with appropriate text and icon based on upload state
 */
function UploadButtonContent({
	hasFiles,
	isUploading,
	uploadProgress,
}: {
	hasFiles: boolean;
	isUploading: boolean;
	uploadProgress: number;
}) {
	if (isUploading) {
		return (
			<>
				<Loader2 className="h-4 w-4 animate-spin" />
				<span className="hidden sm:inline">
					{hasFiles ? `Uploading... ${uploadProgress}%` : "Generating..."}
				</span>
				<span className="sm:hidden">
					{hasFiles ? `${uploadProgress}%` : "Gen..."}
				</span>
			</>
		);
	}

	return (
		<>
			<Upload className="h-4 w-4" />
			<span className="hidden sm:inline">
				{hasFiles ? "Upload & Generate" : "Generate with Existing Materials"}
			</span>
			<span className="sm:hidden">{hasFiles ? "Upload" : "Generate"}</span>
		</>
	);
}

export function UploadWizard({
	courses,
	onUploadSuccess,
	userPlan,
}: UploadWizardProps) {
	const [isOpen, setIsOpen] = useState(false);

	const {
		currentStep,
		selectedCourseId,
		selectedWeekId,
		files,
		selectiveConfig,
		isUploading,
		uploadProgress,
		canProceedToNext,
		proceedToNext,
		goToPrevious,
		reset,
		updateFileStatus,
		setIsUploading,
		setUploadProgress,
	} = useUploadWizardStore();

	const { setBatchProcessingJob } = useCourseMaterialProcessingStore();

	const { data: courseWeeks = [], isLoading: isLoadingCourseWeeks } = useQuery({
		queryKey: ["course-weeks", selectedCourseId],
		queryFn: () => getCourseWeeks(selectedCourseId),
		enabled: !!selectedCourseId,
	});

	// Reset wizard when dialog closes
	useEffect(() => {
		if (!isOpen) {
			reset();
		}
	}, [isOpen, reset]);

	const handleUpload = async () => {
		// Validate configuration
		const errors = validateSelectiveGenerationConfig(selectiveConfig);
		if (errors.length > 0) {
			toast.error(errors[0].message);
			return;
		}

		const maxBatchSize = DOCUMENT_PROCESSING_CONFIG.UPLOAD.maxBatchSize;
		if (files.length > maxBatchSize) {
			toast.error(`Maximum ${maxBatchSize} files allowed per batch`);
			return;
		}

		setIsUploading(true);

		try {
			// If no files to upload, check if we can use existing materials
			if (files.length === 0) {
				const selectedWeek = findWeekById(courseWeeks, selectedWeekId);

				if (!weekHasMaterials(selectedWeek)) {
					toast.error(
						"No files selected and no existing materials found for this week"
					);
					return;
				}

				const featureTypes = Object.keys(
					selectiveConfig.selectedFeatures
				).filter(
					(key) =>
						selectiveConfig.selectedFeatures[
							key as keyof typeof selectiveConfig.selectedFeatures
						]
				) as Array<keyof typeof selectiveConfig.selectedFeatures>;

				if (featureTypes.length === 0) {
					toast.error("Please select at least one feature to generate");
					return;
				}

				// Use on-demand generation API for existing materials
				const response = await fetchWithErrorHandling(
					"/api/generation/trigger",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
						body: JSON.stringify({
							courseId: selectedCourseId,
							weekId: selectedWeekId,
							featureTypes,
							config: selectiveConfig,
						}),
					}
				);

				if (!response.ok) {
					// Error toast already shown by fetchWithErrorHandling
					throw new Error("Failed to start generation");
				}

				const result = await response.json();

				// Store processing job information for real-time tracking
				setBatchProcessingJob([], {
					runId: result.runId,
					publicAccessToken: result.publicAccessToken,
					weekId: selectedWeekId,
					courseId: selectedCourseId,
				});

				toast.success(
					"Content generation started using existing materials. Processing will continue in background."
				);
				setIsOpen(false);
				onUploadSuccess?.();
				return;
			}

			// Standard file upload flow
			const supabase = createClient();
			const uploadedMaterialIds: string[] = [];

			// Upload files one by one
			for (let i = 0; i < files.length; i++) {
				const uploadFile = files[i];
				updateFileStatus(uploadFile.id, "uploading");

				try {
					// Presign upload
					const presignRes = await presignUpload({
						courseId: selectedCourseId,
						weekId: selectedWeekId,
						fileName: uploadFile.file.name,
						mimeType: uploadFile.file.type,
						fileSize: uploadFile.file.size,
					});

					// Upload to storage
					const { error: uploadErr } = await supabase.storage
						.from(COURSE_MATERIALS_BUCKET)
						.uploadToSignedUrl(
							presignRes.filePath,
							presignRes.token,
							uploadFile.file
						);

					if (uploadErr) {
						updateFileStatus(uploadFile.id, "error", uploadErr.message);
					} else {
						updateFileStatus(
							uploadFile.id,
							"success",
							undefined,
							presignRes.materialId
						);
						uploadedMaterialIds.push(presignRes.materialId);
					}
				} catch {
					updateFileStatus(uploadFile.id, "error", "Upload preparation failed");
				}

				// Update progress
				setUploadProgress(Math.round(((i + 1) / files.length) * 100));
			}

			if (uploadedMaterialIds.length === 0) {
				toast.error("No files uploaded successfully");
				return;
			}

			// Complete upload and trigger processing
			const result = await completeUpload(
				uploadedMaterialIds,
				selectedWeekId,
				selectedCourseId,
				selectiveConfig
			);

			// Store processing job information for real-time tracking
			setBatchProcessingJob(uploadedMaterialIds, {
				runId: result.runId,
				publicAccessToken: result.publicAccessToken,
				weekId: result.weekId,
				courseId: result.courseId,
			});

			const successMessage =
				uploadedMaterialIds.length === files.length
					? `Successfully uploaded ${uploadedMaterialIds.length} file(s)`
					: `Uploaded ${uploadedMaterialIds.length} of ${files.length} file(s)`;

			toast.success(
				`${successMessage}. Processing will continue in background.`
			);

			setIsOpen(false);
			onUploadSuccess?.();
		} catch (error) {
			logger.error("Failed to complete upload", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			toast.error("Failed to complete upload. Please try again.");
		} finally {
			setIsUploading(false);
			setUploadProgress(0);
		}
	};

	const currentStepIndex = STEPS.indexOf(currentStep);
	const progressPercentage = ((currentStepIndex + 1) / STEPS.length) * 100;

	const renderStep = () => {
		switch (currentStep) {
			case "course-selection":
				return <StepCourseSelection courses={courses} />;
			case "file-upload":
				return <StepFileUpload userPlan={userPlan} />;
			case "feature-selection":
				return <StepFeatureSelection />;
			case "generation-settings":
				return <StepGenerationSettings />;
			case "review-and-upload":
				return <StepReviewUpload courses={courses} courseWeeks={courseWeeks} />;
			default:
				return null;
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button size="lg" className="gap-2">
					<Upload className="h-4 w-4" />
					Upload & Generate
				</Button>
			</DialogTrigger>
			<DialogContent
				className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col sm:max-w-2xl md:max-w-3xl lg:max-w-4xl"
				onPointerDownOutside={(e) => isUploading && e.preventDefault()}
				onEscapeKeyDown={(e) => isUploading && e.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						Upload Course Materials
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Info className="h-4 w-4 text-muted-foreground cursor-help" />
								</TooltipTrigger>
								<TooltipContent className="max-w-xs">
									<p>
										Upload course materials including PDFs, Office documents,
										and text files. You can choose which AI features to generate
										and customize settings for each.
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</DialogTitle>
					<DialogDescription>
						Follow the steps to upload materials and configure AI content
						generation
					</DialogDescription>
				</DialogHeader>

				{/* Progress Bar */}
				<div className="space-y-2">
					<Progress value={progressPercentage} className="h-2" />
					<div className="flex justify-between text-xs text-muted-foreground overflow-x-auto">
						{STEPS.map((step, index) => {
							const stepConfig = STEP_CONFIG[step];
							const isActive = index === currentStepIndex;
							const isCompleted = index < currentStepIndex;

							return (
								<div
									key={step}
									className={`flex-shrink-0 px-1 ${
										isActive
											? "text-primary font-medium"
											: isCompleted
												? "text-primary"
												: ""
									}`}
								>
									<span className="hidden sm:inline">
										{index + 1}. {stepConfig.title}
									</span>
									<span className="sm:hidden">{index + 1}</span>
								</div>
							);
						})}
					</div>
				</div>

				{/* Step Content */}
				<div className="flex-1 overflow-y-auto py-4">{renderStep()}</div>

				{/* Footer Actions */}
				<div className="flex flex-col sm:flex-row sm:justify-between items-center pt-4 border-t gap-3 sm:gap-0">
					<div className="order-2 sm:order-1">
						{currentStepIndex > 0 && !isUploading && (
							<Button
								variant="outline"
								onClick={() => goToPrevious(courseWeeks)}
								className="gap-2 w-full sm:w-auto"
							>
								<ChevronLeft className="h-4 w-4" />
								<span className="hidden sm:inline">Previous</span>
								<span className="sm:hidden">Back</span>
							</Button>
						)}
					</div>

					<div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
						<Button
							variant="outline"
							onClick={() => setIsOpen(false)}
							disabled={isUploading}
							className="flex-1 sm:flex-none"
						>
							Cancel
						</Button>

						{currentStep === "review-and-upload" ? (
							<Button
								onClick={handleUpload}
								disabled={isUploading}
								className="gap-2 flex-1 sm:flex-none"
							>
								<UploadButtonContent
									hasFiles={files.length > 0}
									isUploading={isUploading}
									uploadProgress={uploadProgress}
								/>
							</Button>
						) : (
							<Button
								onClick={() => proceedToNext(courseWeeks)}
								disabled={!canProceedToNext(courseWeeks, isLoadingCourseWeeks)}
								className="gap-2 flex-1 sm:flex-none"
							>
								<span className="hidden sm:inline">
									{isLoadingCourseWeeks ? "Loading..." : "Next"}
								</span>
								<span className="sm:hidden">
									{isLoadingCourseWeeks ? "Loading..." : "Next"}
								</span>
								<ChevronRight className="h-4 w-4" />
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
