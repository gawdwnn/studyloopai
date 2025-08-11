"use client";

import { FileUploadDropzone } from "@/components/course/file-upload-dropzone";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	DOCUMENT_PROCESSING_CONFIG,
	getDropzoneDescription,
} from "@/lib/config/document-processing";
import type { UserPlan } from "@/lib/processing/types";
import { useUploadWizardStore } from "@/stores/upload-wizard-store";
import { Info } from "lucide-react";

export function StepFileUpload({ userPlan }: { userPlan: UserPlan }) {
	const { files, addFiles, removeFile } = useUploadWizardStore();
	const dropzoneDescription = getDropzoneDescription(userPlan);

	const handleFilesAdded = (newFiles: File[]) => {
		// Filter out duplicates
		const existingFileNames = files.map((f) => f.file.name);
		const uniqueNewFiles = newFiles.filter(
			(file) => !existingFileNames.includes(file.name)
		);

		if (uniqueNewFiles.length > 0) {
			addFiles(uniqueNewFiles);
		}
	};

	const handleRemoveFile = (index: number) => {
		const fileToRemove = files[index];
		if (fileToRemove) {
			removeFile(fileToRemove.id);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Upload Course Materials</CardTitle>
				<CardDescription>
					Upload your course materials. You can upload multiple files at once.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Label>Course Materials *</Label>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Info className="h-4 w-4 text-muted-foreground cursor-help" />
								</TooltipTrigger>
								<TooltipContent className="max-w-xs">
									<p>
										Supported formats: {dropzoneDescription}. Text will be
										extracted and processed for AI content generation.
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<FileUploadDropzone
						onFilesAdded={handleFilesAdded}
						files={files.map((f) => f.file)}
						onRemoveFile={handleRemoveFile}
						userPlan={userPlan}
					/>
					<p className="text-sm text-muted-foreground">
						Maximum {DOCUMENT_PROCESSING_CONFIG.UPLOAD.maxBatchSize} files per
						upload batch.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
