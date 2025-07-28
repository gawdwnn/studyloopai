"use client";

import { UploadWizard } from "@/components/course/upload-wizard";
import type { Course } from "@/types/database-types";

interface UploadWizardWrapperProps {
	courses: Course[];
}

export function UploadWizardWrapper({ courses }: UploadWizardWrapperProps) {
	const handleUploadSuccess = () => {
		// Emit a custom event that the client component can listen to
		window.dispatchEvent(new Event("upload-success"));
	};

	return (
		<UploadWizard courses={courses} onUploadSuccess={handleUploadSuccess} />
	);
}
