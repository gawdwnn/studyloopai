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
import { useUploadWizardStore } from "@/stores/upload-wizard-store";
import { Info } from "lucide-react";

export function StepFileUpload() {
	const { files, addFiles, removeFile } = useUploadWizardStore();

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
					Upload PDF files containing your course content. You can upload
					multiple files at once.
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
										Upload PDF files up to 2MB each. Text will be extracted and
										processed for AI content generation.
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<FileUploadDropzone
						onFilesAdded={handleFilesAdded}
						files={files.map((f) => f.file)}
						onRemoveFile={handleRemoveFile}
					/>
					<p className="text-sm text-muted-foreground">
						Maximum 5 files per batch. Supported formats: PDF
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
