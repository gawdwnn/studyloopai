import {
	type CourseWeek,
	canUseExistingMaterials,
	shouldSkipFileUpload,
} from "@/lib/utils/upload-wizard-utils";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

export type WizardStep =
	| "course-selection"
	| "file-upload"
	| "feature-selection"
	| "generation-settings"
	| "review-and-upload";

interface UploadFile {
	file: File;
	id: string;
	status: "pending" | "uploading" | "success" | "error";
	error?: string;
	materialId?: string;
}

interface UploadWizardState {
	// Current step
	currentStep: WizardStep;

	// Course selection
	selectedCourseId: string;
	selectedWeekId: string;
	selectedWeekNumber: number | null;

	// File upload
	files: UploadFile[];

	// Feature selection & generation settings
	selectiveConfig: SelectiveGenerationConfig;

	// Upload state
	isUploading: boolean;
	uploadProgress: number;

	// Actions
	setCurrentStep: (step: WizardStep) => void;
	setCourseSelection: (
		courseId: string,
		weekId: string,
		weekNumber: number
	) => void;
	addFiles: (files: File[]) => void;
	removeFile: (fileId: string) => void;
	updateFileStatus: (
		fileId: string,
		status: UploadFile["status"],
		error?: string,
		materialId?: string
	) => void;
	setSelectiveConfig: (config: SelectiveGenerationConfig) => void;
	setIsUploading: (isUploading: boolean) => void;
	setUploadProgress: (progress: number) => void;

	// Navigation
	canProceedToNext: (
		courseWeeks?: CourseWeek[],
		isLoading?: boolean
	) => boolean;
	proceedToNext: (courseWeeks?: CourseWeek[]) => void;
	goToPrevious: (courseWeeks?: CourseWeek[]) => void;

	// Reset
	reset: () => void;
}

const WIZARD_STEPS: WizardStep[] = [
	"course-selection",
	"file-upload",
	"feature-selection",
	"generation-settings",
	"review-and-upload",
];

export const getDefaultSelectiveConfig = (): SelectiveGenerationConfig => ({
	selectedFeatures: {
		summaries: true,
		goldenNotes: true,
		cuecards: false,
		mcqs: false,
		openQuestions: false,
		conceptMaps: false,
	},
	featureConfigs: {
		goldenNotes: {
			count: 5,
			difficulty: "intermediate",
			focus: "conceptual",
		},
		summaries: {
			count: 1,
			difficulty: "intermediate",
			focus: "conceptual",
			length: "medium",
		},
	},
});

export const useUploadWizardStore = create<UploadWizardState>()(
	devtools(
		subscribeWithSelector((set, get) => ({
			// Initial state
			currentStep: "course-selection",
			selectedCourseId: "",
			selectedWeekId: "",
			selectedWeekNumber: null,
			files: [],
			selectiveConfig: getDefaultSelectiveConfig(),
			isUploading: false,
			uploadProgress: 0,

			// Actions
			setCurrentStep: (step) => set({ currentStep: step }),

			setCourseSelection: (courseId, weekId, weekNumber) =>
				set({
					selectedCourseId: courseId,
					selectedWeekId: weekId,
					selectedWeekNumber: weekNumber,
				}),

			addFiles: (newFiles) =>
				set((state) => ({
					files: [
						...state.files,
						...newFiles.map((file) => ({
							file,
							id: `${file.name}-${Date.now()}-${Math.random()}`,
							status: "pending" as const,
						})),
					],
				})),

			removeFile: (fileId) =>
				set((state) => ({
					files: state.files.filter((f) => f.id !== fileId),
				})),

			updateFileStatus: (fileId, status, error, materialId) =>
				set((state) => ({
					files: state.files.map((f) =>
						f.id === fileId ? { ...f, status, error, materialId } : f
					),
				})),

			setSelectiveConfig: (config) => set({ selectiveConfig: config }),

			setIsUploading: (isUploading) => set({ isUploading }),

			setUploadProgress: (progress) => set({ uploadProgress: progress }),

			// Navigation
			canProceedToNext: (courseWeeks, isLoading = false) => {
				const state = get();

				// Graceful degradation: disable if data is loading
				if (isLoading) return false;

				switch (state.currentStep) {
					case "course-selection":
						return !!state.selectedCourseId && !!state.selectedWeekId;
					case "file-upload":
						return state.files.length > 0;
					case "feature-selection":
						return Object.values(state.selectiveConfig.selectedFeatures).some(
							Boolean
						);
					case "generation-settings":
						return true; // Settings are always valid due to defaults
					case "review-and-upload":
						return canUseExistingMaterials(
							courseWeeks,
							state.selectedWeekId,
							state.files.length > 0
						);
					default:
						return false;
				}
			},

			proceedToNext: (courseWeeks) => {
				const state = get();
				const currentIndex = WIZARD_STEPS.indexOf(state.currentStep);

				if (
					currentIndex < WIZARD_STEPS.length - 1 &&
					state.canProceedToNext(courseWeeks)
				) {
					let nextStep = WIZARD_STEPS[currentIndex + 1];

					// Smart step-skipping: skip file-upload if materials exist
					if (
						state.currentStep === "course-selection" &&
						nextStep === "file-upload" &&
						shouldSkipFileUpload(courseWeeks, state.selectedWeekId)
					) {
						nextStep = "feature-selection";
					}

					set({ currentStep: nextStep });
				}
			},

			goToPrevious: (courseWeeks) => {
				const state = get();
				const currentIndex = WIZARD_STEPS.indexOf(state.currentStep);

				if (currentIndex > 0) {
					let previousStep = WIZARD_STEPS[currentIndex - 1];

					// Smart step-skipping: skip file-upload when going back if materials exist
					if (
						state.currentStep === "feature-selection" &&
						previousStep === "file-upload" &&
						shouldSkipFileUpload(courseWeeks, state.selectedWeekId)
					) {
						previousStep = "course-selection";
					}

					set({ currentStep: previousStep });
				}
			},

			// Reset
			reset: () =>
				set({
					currentStep: "course-selection",
					selectedCourseId: "",
					selectedWeekId: "",
					selectedWeekNumber: null,
					files: [],
					selectiveConfig: getDefaultSelectiveConfig(),
					isUploading: false,
					uploadProgress: 0,
				}),
		})),
		{
			name: "upload-wizard-store",
		}
	)
);
