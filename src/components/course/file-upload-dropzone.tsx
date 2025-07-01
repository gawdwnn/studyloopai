"use client";

import { FILE_UPLOAD_DISPLAY, FILE_UPLOAD_LIMITS } from "@/lib/constants/file-upload";
import { cn } from "@/lib/utils";
import { FileIcon, UploadCloudIcon, XIcon } from "lucide-react";
import { useCallback } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { toast } from "sonner";

interface FileUploadDropzoneProps {
	onFilesAdded: (files: File[]) => void;
	acceptedFileTypes?: Record<string, string[]>;
	maxFileSize?: number; // in bytes
	className?: string;
	files: File[];
	onRemoveFile: (index: number) => void;
}

export function FileUploadDropzone({
	onFilesAdded,
	acceptedFileTypes = FILE_UPLOAD_LIMITS.ACCEPTED_FILE_TYPES,
	maxFileSize = FILE_UPLOAD_LIMITS.MAX_FILE_SIZE,
	className,
	files,
	onRemoveFile,
}: FileUploadDropzoneProps) {
	const onDrop = useCallback(
		(acceptedFiles: File[], fileRejections: FileRejection[]) => {
			if (fileRejections.length > 0) {
				for (const rejection of fileRejections) {
					for (const error of rejection.errors) {
						// Log validation errors to console for debugging
						console.warn("File validation error:", {
							fileName: rejection.file.name,
							fileSize: rejection.file.size,
							errorCode: error.code,
							message: error.message,
						});

						if (error.code === "file-too-large") {
							toast.error(FILE_UPLOAD_DISPLAY.FILE_TOO_LARGE);
						} else if (error.code === "file-invalid-type") {
							toast.error("Invalid file type. Only PDFs are accepted.");
						} else {
							toast.error(error.message);
						}
					}
				}
				return;
			}
			onFilesAdded(acceptedFiles);
		},
		[onFilesAdded]
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: acceptedFileTypes,
		maxSize: maxFileSize,
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
								<span className="font-semibold">Click to upload</span> or drag and drop
							</>
						)}
					</p>
					<p className="text-xs text-muted-foreground">{FILE_UPLOAD_DISPLAY.DROPZONE_TEXT}</p>
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
