"use client";

import { ChevronLeft, ChevronRight, Settings, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CourseWeekSelector } from "@/components/course/course-week-selector";
import { FileUploadDropzone } from "@/components/course/file-upload-dropzone";
import { GenerationSettings } from "@/components/course/generation-settings";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { courses } from "@/db/schema";
import { uploadAndProcessMaterialsBatch } from "@/lib/actions/content-processing-batch";
import { getCourseWeeks } from "@/lib/actions/courses";
import { useQuery } from "@tanstack/react-query";

interface CourseMaterialUploadWizardProps {
  courses: (typeof courses.$inferSelect)[];
  onUploadSuccess: () => void;
}

export interface GenerationConfig {
  goldenNotesCount: number;
  flashcardsCount: number;
  summaryLength: number;
  examExercisesCount: number;
  mcqExercisesCount: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  focus: "conceptual" | "practical" | "mixed";
}

export interface UploadData {
  courseId: string;
  weekId: string;
  files: File[];
  outputLanguage: string;
  generationConfig: GenerationConfig;
}

export interface MaterialUploadData {
  courseId: string;
  weekId?: string;
  file: File;
  generationConfig: GenerationConfig;
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

const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  goldenNotesCount: 5,
  flashcardsCount: 10,
  summaryLength: 300,
  examExercisesCount: 5,
  mcqExercisesCount: 10,
  difficulty: "intermediate",
  focus: "conceptual",
};

export function CourseMaterialUploadWizard({
  courses,
  onUploadSuccess,
}: CourseMaterialUploadWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>(
    WIZARD_STEPS.COURSE_AND_FILES
  );

  // Step 1 data
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [outputLanguage, setOutputLanguage] = useState<string>("english");

  // Step 2 data
  const [generationConfig, setGenerationConfig] = useState<GenerationConfig>(
    DEFAULT_GENERATION_CONFIG
  );

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
    setOutputLanguage("english");
    setGenerationConfig(DEFAULT_GENERATION_CONFIG);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetWizard();
  };

  const canProceedToStep2 = () => {
    return (
      selectedCourseId && selectedWeek && files.length > 0 && outputLanguage
    );
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

    const selectedWeekData = courseWeeks.find(
      (week) =>
        week.courseId === selectedCourseId && week.weekNumber === selectedWeek
    );

    if (!selectedWeekData) {
      toast.error("Selected week not found");
      return;
    }

    try {
      const materialData: MaterialUploadData[] = files.map((file) => ({
        courseId: selectedCourseId,
        weekId: selectedWeekData.id,
        file,
        generationConfig,
      }));

      const result = await uploadAndProcessMaterialsBatch(materialData);

      if (result.success) {
        const successCount = result.successCount || 0;
        const failedCount = result.failedMaterials?.length || 0;

        toast.success(
          `Batch upload started! Processing ${successCount} materials.`,
          {
            description:
              failedCount > 0
                ? `${failedCount} file(s) failed to upload.`
                : "All files are processing in background.",
            duration: 4000,
          }
        );

        if (result.failedMaterials?.length) {
          for (const failure of result.failedMaterials) {
            toast.error(
              `Failed to upload ${failure.fileName}: ${failure.error}`
            );
          }
        }
      } else {
        toast.error(`Batch upload failed: ${result.error}`);
        return;
      }

      handleClose();
      onUploadSuccess();
    } catch (error) {
      toast.error("Failed to start upload. Please try again.");
      console.error("Upload initiation error:", error);
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
              showBadges={true}
              courseLabel="Course"
              weekLabel="Week"
              required={true}
            />

            {/* Output Language */}
            <div className="space-y-2">
              <Label htmlFor="language-select">Output Language *</Label>
              <Select value={outputLanguage} onValueChange={setOutputLanguage}>
                <SelectTrigger id="language-select" className="w-full">
                  <SelectValue placeholder="Select output language..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">🇺🇸 English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

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
                outputLanguage={outputLanguage}
              />
            )}
            <Separator />

            {/* //TODO: generaion config feature end-end */}
            <GenerationSettings
              config={generationConfig}
              onConfigChange={setGenerationConfig}
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
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
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
              <Button onClick={handleGenerate} className="gap-2">
                Generate Content
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
