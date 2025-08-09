/**
 * Utility functions for upload wizard functionality
 * Centralizes common patterns and reduces code duplication
 */

export type CourseWeek = {
	id: string;
	hasMaterials: boolean | null;
};

/**
 * Finds a week by ID from course weeks array
 * Centralizes the common pattern used throughout the upload wizard
 */
export function findWeekById(
	courseWeeks: CourseWeek[] | undefined,
	weekId: string
): CourseWeek | undefined {
	return courseWeeks?.find((week) => week.id === weekId);
}

/**
 * Checks if a week has existing materials
 * Treats null as false (matches database default behavior)
 */
export function weekHasMaterials(week: CourseWeek | undefined): boolean {
	return week?.hasMaterials === true;
}

/**
 * Checks if file upload step should be skipped based on existing materials
 * Encapsulates the step-skipping logic used in navigation
 */
export function shouldSkipFileUpload(
	courseWeeks: CourseWeek[] | undefined,
	selectedWeekId: string
): boolean {
	const selectedWeek = findWeekById(courseWeeks, selectedWeekId);
	return weekHasMaterials(selectedWeek);
}

/**
 * Determines if user can proceed with existing materials (no files needed)
 * Used to validate proceeding without file uploads
 */
export function canUseExistingMaterials(
	courseWeeks: CourseWeek[] | undefined,
	selectedWeekId: string,
	hasFiles: boolean
): boolean {
	if (hasFiles) return true;
	return shouldSkipFileUpload(courseWeeks, selectedWeekId);
}

/**
 * Gets appropriate button text based on upload mode
 * Simplifies button text logic throughout components
 */
export function getUploadButtonText(
	hasFiles: boolean,
	isUploading: boolean,
	uploadProgress: number,
	responsive: "full" | "short" = "full"
): {
	icon: string;
	text: string;
} {
	if (isUploading) {
		const text =
			responsive === "full"
				? hasFiles
					? `Uploading... ${uploadProgress}%`
					: "Generating..."
				: hasFiles
					? `${uploadProgress}%`
					: "Gen...";
		return { icon: "loader", text };
	}

	const text =
		responsive === "full"
			? hasFiles
				? "Upload & Generate"
				: "Generate with Existing Materials"
			: hasFiles
				? "Upload"
				: "Generate";

	return { icon: "upload", text };
}
