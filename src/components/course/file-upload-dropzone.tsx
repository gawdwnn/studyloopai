"use client";

import {
	type UserPlan,
	getDropzoneDescription,
	getSupportedFileTypes,
	validateFile,
} from "@/lib/config/document-processing";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import { FileIcon, UploadCloudIcon, XIcon } from "lucide-react";
import { useCallback } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { toast } from "sonner";

interface FileUploadDropzoneProps {
	onFilesAdded: (files: File[]) => void;
	userPlan: UserPlan; // Keep for future plan-based features
	className?: string;
	files: File[];
	onRemoveFile: (index: number) => void;
}

export function FileUploadDropzone({
	onFilesAdded,
	userPlan: _,
	className,
	files,
	onRemoveFile,
}: FileUploadDropzoneProps) {
	// Get file type configuration
	const supportedFileTypes = getSupportedFileTypes();
	const dropzoneDescription = getDropzoneDescription();
	const onDrop = useCallback(
		(acceptedFiles: File[], fileRejections: FileRejection[]) => {
			// Handle rejected files from dropzone
			if (fileRejections.length > 0) {
				for (const rejection of fileRejections) {
					const validation = validateFile(rejection.file);
					logger.warn("File validation error", {
						fileName: rejection.file.name,
						fileSize: rejection.file.size,
						validationError: validation.error,
					});

					if (validation.error) {
						toast.error(validation.error);
					}
				}
				return;
			}

			// Additional validation for accepted files using our consolidated config
			const validFiles: File[] = [];
			for (const file of acceptedFiles) {
				const validation = validateFile(file);
				if (validation.isValid) {
					validFiles.push(file);
				} else {
					toast.error(validation.error);
					logger.warn("File failed additional validation", {
						fileName: file.name,
						fileSize: file.size,
						validationError: validation.error,
					});
				}
			}

			if (validFiles.length > 0) {
				onFilesAdded(validFiles);
			}
		},
		[onFilesAdded]
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: supportedFileTypes,
		// File size validated via validateFile(userPlan) onDrop, not by dropzone config
	});

	return (
		<div>
			<div
				{...getRootProps()}
				className={cn(
					"flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors",
					{ "border-primary bg-muted": isDragActive },
					className
				)}
			>
				<input {...getInputProps()} />
				<div className="flex flex-col items-center justify-center pt-5 pb-6">
					<UploadCloudIcon
						className={cn("w-10 h-10 mb-4 text-muted-foreground", {
							"text-primary": isDragActive,
						})}
					/>
					<p
						className={cn("mb-2 text-sm text-muted-foreground", {
							"text-primary": isDragActive,
						})}
					>
						{isDragActive ? (
							"Drop the files here ..."
						) : (
							<>
								<span className="font-semibold">Click to upload</span> or drag
								and drop
							</>
						)}
					</p>
					<p className="text-xs text-muted-foreground">{dropzoneDescription}</p>
				</div>
			</div>
			{files.length > 0 && (
				<div className="mt-4 space-y-2">
					<h4 className="text-lg font-medium">Selected Files</h4>
					<ul className="divide-y rounded-md border">
						{files.map((file, index) => (
							<li
								key={`${file.name}-${file.lastModified}`}
								className="flex items-center justify-between p-2"
							>
								<div className="flex items-center gap-2">
									<FileIcon className="h-5 w-5 text-muted-foreground" />
									<span className="text-sm font-medium">{file.name}</span>
								</div>
								<button
									type="button"
									onClick={() => onRemoveFile(index)}
									className="p-1 text-muted-foreground rounded-full hover:bg-muted hover:text-destructive"
								>
									<XIcon className="h-5 w-5" />
								</button>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
