"use client";

import { SelectiveGenerationSettings } from "@/components/course/selective-generation-settings";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useFeatureAvailability } from "@/hooks/use-feature-availability";
import { useUploadWizardStore } from "@/stores/upload-wizard-store";

export function StepGenerationSettings() {
	const {
		selectiveConfig,
		setSelectiveConfig,
		selectedCourseId,
		selectedWeekId,
	} = useUploadWizardStore();

	// feature availability
	const { data: featureAvailability } = useFeatureAvailability(
		selectedCourseId,
		selectedWeekId
	);

	// Only show settings for selected features
	const hasSelectedFeatures = Object.values(
		selectiveConfig.selectedFeatures
	).some(Boolean);

	if (!hasSelectedFeatures) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Generation Settings</CardTitle>
					<CardDescription>
						No features selected. Please go back and select at least one feature
						to configure.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Configure Generation Settings</CardTitle>
				<CardDescription>
					Fine-tune the settings for your selected features to match your course
					requirements
				</CardDescription>
			</CardHeader>
			<CardContent>
				<SelectiveGenerationSettings
					config={selectiveConfig}
					onConfigChange={setSelectiveConfig}
					featureAvailability={featureAvailability}
					showAvailabilityStatus={true}
				/>
			</CardContent>
		</Card>
	);
}
