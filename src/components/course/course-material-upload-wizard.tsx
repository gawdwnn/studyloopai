"use client";

import {
	ChevronLeft,
	ChevronRight,
	Loader2,
	Settings,
	Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CourseWeekSelector } from "@/components/course/course-week-selector";
import { FileUploadDropzone } from "@/components/course/file-upload-dropzone";
import { SelectiveGenerationSettings } from "@/components/course/selective-generation-settings";
import { UploadSummary } from "@/components/course/upload-summary";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { markMaterialsUploadFailed } from "@/lib/actions/course-materials";
import { getCourseWeeks } from "@/lib/actions/courses";
import { COURSE_MATERIALS_BUCKET } from "@/lib/constants/storage";
import {
	type PresignUploadResponse,
	completeUpload,
	presignUpload,
} from "@/lib/services/course-material-service";
import { createClient } from "@/lib/supabase/client";
import { handleErrorWithLogging } from "@/lib/utils/error-messages";
import { getDefaultSelectiveConfig } from "@/stores/upload-wizard-store";
import type { Course } from "@/types/database-types";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { useQuery } from "@tanstack/react-query";

interface CourseMaterialUploadWizardProps {
	courses: Course[];
	onUploadSuccess: () => void;
}

export interface UploadData {
	courseId: string;
	weekId: string;
	files: File[];
	generationConfig: SelectiveGenerationConfig;
}

export interface MaterialUploadData {
	courseId: string;
	weekId?: string;
	file: File;
	generationConfig: SelectiveGenerationConfig;
	contentType?: string;
}

const WIZARD_STEPS = {
	COURSE_AND_FILES: "course_and_files",
	GENERATION_SETTINGS: "generation_settings",
} as const;

type WizardStep = (typeof WIZARD_STEPS)[keyof typeof WIZARD_STEPS];

const STEPS = [
	{ id: WIZARD_STEPS.COURSE_AND_FILES, title: "Course & Files", icon: Upload },
	{
		id: WIZARD_STEPS.GENERATION_SETTINGS,
		title: "Generation Settings",
		icon: Settings,
	},
];

export function CourseMaterialUploadWizard({
	courses,
	onUploadSuccess,
}: CourseMaterialUploadWizardProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [currentStep, setCurrentStep] = useState<WizardStep>(
		WIZARD_STEPS.COURSE_AND_FILES
	);
	const [isUploading, setIsUploading] = useState(false);

	// Step 1 data
	const [selectedCourseId, setSelectedCourseId] = useState<string>("");
	const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
	const [files, setFiles] = useState<File[]>([]);

	// Selective generation config with store's default
	const [selectiveConfig, setSelectiveConfig] =
		useState<SelectiveGenerationConfig>(getDefaultSelectiveConfig);

	const selectedCourse = courses.find((c) => c.id === selectedCourseId);

	const { data: courseWeeks = [], isLoading: isLoadingWeeks } = useQuery({
		queryKey: ["course-weeks", selectedCourseId],
		queryFn: () => getCourseWeeks(selectedCourseId),
		enabled: !!selectedCourseId,
	});

	const resetWizard = () => {
		setCurrentStep(WIZARD_STEPS.COURSE_AND_FILES);
		setSelectedCourseId("");
		setSelectedWeek(null);
		setFiles([]);
		setSelectiveConfig(getDefaultSelectiveConfig());
		setIsUploading(false);
	};

	const handleClose = () => {
		setIsOpen(false);
		resetWizard();
	};

	const canProceedToStep2 = () => {
		return selectedCourseId && selectedWeek && files.length > 0;
	};

	const handleNextStep = () => {
		if (currentStep === WIZARD_STEPS.COURSE_AND_FILES && canProceedToStep2()) {
			setCurrentStep(WIZARD_STEPS.GENERATION_SETTINGS);
		}
	};

	const handlePreviousStep = () => {
		if (currentStep === WIZARD_STEPS.GENERATION_SETTINGS) {
			setCurrentStep(WIZARD_STEPS.COURSE_AND_FILES);
		}
	};

	const handleGenerate = async () => {
		if (!canProceedToStep2()) {
			toast.error("Please complete all required fields");
			return;
		}

		if (!selectedWeek) {
			toast.error("Week selection is required");
			return;
		}

		// Validate selective generation config
		const { validateSelectiveGenerationConfig } = await import(
			"@/lib/validation/generation-config"
		);
		const errors = validateSelectiveGenerationConfig(selectiveConfig);
		if (errors.length > 0) {
			toast.error(errors[0].message);
			return;
		}

		// Client-side batch size validation
		if (files.length > 5) {
			toast.error(
				"Maximum 5 files allowed per batch. Please reduce the number of files."
			);
			return;
		}

		const selectedWeekData = courseWeeks.find(
			(week) =>
				week.courseId === selectedCourseId && week.weekNumber === selectedWeek
		);

		if (!selectedWeekData) {
			toast.error("Selected week not found");
			return;
		}

		setIsUploading(true);
		const supabase = createClient();
		const uploadedMaterialIds: string[] = [];

		try {
			const failedUploads: Array<{
				fileName: string;
				error: string;
				materialId?: string;
			}> = [];

			for (const file of files) {
				let presignRes: PresignUploadResponse | null = null;
				try {
					// Step 1: presign
					presignRes = await presignUpload({
						courseId: selectedCourseId,
						weekId: selectedWeekData.id,
						fileName: file.name,
						mimeType: file.type,
						fileSize: file.size,
					});

					// Step 2: upload via signed URL
					const { error: uploadErr } = await supabase.storage
						.from(COURSE_MATERIALS_BUCKET)
						.uploadToSignedUrl(presignRes.filePath, presignRes.token, file);

					if (uploadErr) {
						const errorMessage = handleErrorWithLogging(
							uploadErr,
							"File storage upload",
							{ fileName: file.name, bucket: COURSE_MATERIALS_BUCKET }
						);
						failedUploads.push({
							fileName: file.name,
							error: errorMessage,
							materialId: presignRes.materialId,
						});
						continue;
					}

					uploadedMaterialIds.push(presignRes.materialId);
				} catch (fileErr) {
					// Handle individual file errors (e.g., validation failures)
					const errorMessage = handleErrorWithLogging(
						fileErr instanceof Error ? fileErr : "Unknown error occurred",
						"File upload",
						{ fileName: file.name, fileSize: file.size }
					);
					failedUploads.push({
						fileName: file.name,
						error: errorMessage,
						materialId: presignRes?.materialId, // May be undefined if presign failed
					});
				}
			}

			// Report failed uploads and update database status
			if (failedUploads.length > 0) {
				const failedFileNames = failedUploads.map((f) => f.fileName).join(", ");
				toast.error(`Failed to upload: ${failedFileNames}`);

				// Mark failed uploads in database
				const failedMaterialIds = failedUploads
					.map((f) => f.materialId)
					.filter((id): id is string => !!id);

				if (failedMaterialIds.length > 0) {
					try {
						await markMaterialsUploadFailed(failedMaterialIds);
					} catch (statusErr) {
						console.error(
							"Failed to update upload status in database:",
							statusErr
						);
					}
				}
			}

			if (uploadedMaterialIds.length === 0) {
				toast.error(
					"No files uploaded successfully. Please check file requirements and try again."
				);
				return;
			}

			// Step 3: notify backend to start processing
			try {
				await completeUpload(
					uploadedMaterialIds,
					selectedWeekData.id,
					selectedCourseId,
					selectiveConfig
				);

				const successMessage =
					uploadedMaterialIds.length === files.length
						? `Successfully uploaded ${uploadedMaterialIds.length} file(s). Processing will continue in background.`
						: `Uploaded ${uploadedMaterialIds.length} of ${files.length} file(s). Processing will continue in background.`;

				toast.success(successMessage);
				handleClose();
				onUploadSuccess();
			} catch (processErr) {
				// Handle processing initiation errors
				const errorMessage = handleErrorWithLogging(
					processErr instanceof Error
						? processErr
						: "Processing initialization failed",
					"Upload completion",
					{
						materialIds: uploadedMaterialIds,
						weekId: selectedWeekData.id,
						courseId: selectedCourseId,
					}
				);
				toast.error(
					`Files uploaded successfully but ${errorMessage.toLowerCase()}`
				);
			}
		} catch (err) {
			// Handle unexpected errors
			const errorMessage = handleErrorWithLogging(
				err instanceof Error ? err : "Unexpected error during upload",
				"Upload process",
				{
					selectedCourseId,
					selectedWeek,
					fileCount: files.length,
				}
			);
			toast.error(errorMessage);
		} finally {
			setIsUploading(false);
		}
	};

	const handleWeekChange = (weekNum: number) => {
		setSelectedWeek(weekNum);
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (open) {
					setIsOpen(true);
				} else {
					handleClose();
				}
			}}
		>
			<DialogTrigger asChild>
				<Button size="lg" className="gap-2">
					<Upload className="h-4 w-4" />
					Upload & Generate
				</Button>
			</DialogTrigger>
			<DialogContent
				className="max-w-4xl max-h-[90vh] overflow-y-auto"
				onPointerDownOutside={(e) => e.preventDefault()}
				onEscapeKeyDown={(e) => e.preventDefault()}
			>
				<DialogHeader className="space-y-2 mb-4">
					<DialogTitle className="flex items-center gap-2">
						Course Content Upload & Generation
					</DialogTitle>
					<DialogDescription>
						Upload your course materials and configure AI content generation
						settings
					</DialogDescription>
				</DialogHeader>

				{/* Progress Steps */}
				<div className="flex items-center justify-between mb-6">
					{STEPS.map((step, index) => {
						const Icon = step.icon;
						const isActive = currentStep === step.id;
						const isCompleted =
							currentStep === WIZARD_STEPS.GENERATION_SETTINGS &&
							step.id === WIZARD_STEPS.COURSE_AND_FILES;

						return (
							<div key={step.id} className="flex items-center">
								<div
									className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
										isActive
											? "border-primary bg-primary text-primary-foreground"
											: isCompleted
												? "border-green-500 bg-green-500 text-white"
												: "border-muted-foreground text-muted-foreground"
									}`}
								>
									<Icon className="h-4 w-4" />
								</div>
								<div className="ml-2">
									<p
										className={`text-sm font-medium ${
											isActive ? "text-primary" : "text-muted-foreground"
										}`}
									>
										{step.title}
									</p>
								</div>
								{index < STEPS.length - 1 && (
									<div className="w-16 h-px bg-border mx-4" />
								)}
							</div>
						);
					})}
				</div>

				{/* Step 1: Course & Files */}
				{currentStep === WIZARD_STEPS.COURSE_AND_FILES && (
					<div className="space-y-6">
						<CourseWeekSelector
							courses={courses}
							courseWeeks={courseWeeks}
							selectedCourseId={selectedCourseId}
							onCourseChange={(courseId) => {
								setSelectedCourseId(courseId);
								setSelectedWeek(null);
							}}
							selectedWeek={selectedWeek}
							onWeekChange={handleWeekChange}
							isLoading={isLoadingWeeks}
							courseLabel="Course"
							weekLabel="Week"
							required={true}
							showOnlyWeeksWithoutMaterials={true}
						/>

						{/* File Upload */}
						<div className="space-y-2">
							<Label>Course Materials *</Label>
							<FileUploadDropzone
								onFilesAdded={(newFiles) =>
									setFiles((f) => [...f, ...newFiles])
								}
								files={files}
								onRemoveFile={(index) =>
									setFiles((f) => f.filter((_, i) => i !== index))
								}
							/>
						</div>
					</div>
				)}

				{/* Step 2: Generation Settings */}
				{currentStep === WIZARD_STEPS.GENERATION_SETTINGS && (
					<div className="space-y-6">
						{selectedWeek && (
							<UploadSummary
								course={selectedCourse}
								courseWeeks={courseWeeks}
								weekNumber={selectedWeek}
								files={files}
							/>
						)}
						<Separator />

						<SelectiveGenerationSettings
							config={selectiveConfig}
							onConfigChange={setSelectiveConfig}
						/>
					</div>
				)}

				{/* Footer Actions */}
				<div className="flex justify-between pt-4 border-t">
					<div>
						{currentStep === WIZARD_STEPS.GENERATION_SETTINGS && (
							<Button
								variant="outline"
								onClick={handlePreviousStep}
								disabled={isUploading}
								className="gap-2"
							>
								<ChevronLeft className="h-4 w-4" />
								Previous
							</Button>
						)}
					</div>

					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={handleClose}
							disabled={isUploading}
						>
							Cancel
						</Button>

						{currentStep === WIZARD_STEPS.COURSE_AND_FILES ? (
							<Button
								onClick={handleNextStep}
								disabled={!canProceedToStep2()}
								className="gap-2"
							>
								Next
								<ChevronRight className="h-4 w-4" />
							</Button>
						) : (
							<Button
								onClick={handleGenerate}
								disabled={isUploading}
								className="gap-2"
							>
								{isUploading ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Uploading...
									</>
								) : (
									"Generate Content"
								)}
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
