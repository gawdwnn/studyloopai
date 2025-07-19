"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useUploadWizardStore } from "@/stores/upload-wizard-store";
import type { Course, CourseWeek } from "@/types/database-types";
import { CheckCircle, XCircle } from "lucide-react";
import { useMemo } from "react";

interface StepReviewUploadProps {
	courses: Course[];
	courseWeeks: CourseWeek[];
}

const FEATURE_LABELS = {
	cuecards: "Cuecards",
	mcqs: "MCQs",
	openQuestions: "Open Questions",
	summaries: "Summaries",
	goldenNotes: "Golden Notes",
};

export function StepReviewUpload({
	courses,
	courseWeeks,
}: StepReviewUploadProps) {
	const {
		selectedCourseId,
		selectedWeekNumber,
		files,
		selectiveConfig,
		isUploading,
		uploadProgress,
	} = useUploadWizardStore();

	const selectedCourse = courses.find((c) => c.id === selectedCourseId);
	const selectedWeek = courseWeeks.find(
		(w) =>
			w.courseId === selectedCourseId && w.weekNumber === selectedWeekNumber
	);

	const uploadStats = useMemo(() => {
		const total = files.length;
		const uploaded = files.filter((f) => f.status === "success").length;
		const failed = files.filter((f) => f.status === "error").length;
		const pending = files.filter((f) => f.status === "pending").length;
		const uploading = files.filter((f) => f.status === "uploading").length;

		return { total, uploaded, failed, pending, uploading };
	}, [files]);

	const selectedFeatures = Object.entries(selectiveConfig.selectedFeatures)
		.filter(([_, selected]) => selected)
		.map(([feature]) => feature);

	return (
		<div className="space-y-4">
			{/* Summary Card */}
			<Card>
				<CardHeader>
					<CardTitle>Review & Upload</CardTitle>
					<CardDescription>
						Review your selections before uploading and generating content
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Course & Week Info */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="text-sm text-muted-foreground">Course</p>
							<p className="font-medium">
								{selectedCourse?.name || "Not selected"}
							</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Week</p>
							<p className="font-medium">
								{selectedWeek
									? `Week ${selectedWeek.weekNumber}: ${selectedWeek.title || ""}`
									: "Not selected"}
							</p>
						</div>
					</div>

					<Separator />

					{/* Files Summary */}
					<div>
						<h4 className="font-medium mb-3">Files to Upload</h4>
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Total Files</span>
								<Badge variant="secondary">{uploadStats.total}</Badge>
							</div>
							{isUploading && (
								<>
									<Progress value={uploadProgress} className="h-2" />
									<div className="grid grid-cols-2 gap-2 text-sm">
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-green-500" />
											<span>{uploadStats.uploaded} uploaded</span>
										</div>
										{uploadStats.failed > 0 && (
											<div className="flex items-center gap-2">
												<XCircle className="h-4 w-4 text-red-500" />
												<span>{uploadStats.failed} failed</span>
											</div>
										)}
									</div>
								</>
							)}
						</div>
					</div>

					<Separator />

					{/* Selected Features */}
					<div>
						<h4 className="font-medium mb-3">Features to Generate</h4>
						<div className="flex flex-wrap gap-2">
							{selectedFeatures.length > 0 ? (
								selectedFeatures.map((feature) => (
									<Badge key={feature} variant="default">
										{FEATURE_LABELS[feature as keyof typeof FEATURE_LABELS]}
									</Badge>
								))
							) : (
								<p className="text-sm text-muted-foreground">
									No features selected
								</p>
							)}
						</div>
					</div>

					<Separator />

					{/* Generation Settings Summary */}
					<div>
						<h4 className="font-medium mb-3">Generation Settings</h4>
						<div className="grid gap-3">
							{selectedFeatures.map((feature) => {
								const config =
									selectiveConfig.featureConfigs[
										feature as keyof typeof selectiveConfig.featureConfigs
									];
								if (!config) return null;

								return (
									<div
										key={feature}
										className="flex items-center justify-between text-sm"
									>
										<span className="text-muted-foreground">
											{FEATURE_LABELS[feature as keyof typeof FEATURE_LABELS]}
										</span>
										<div className="flex items-center gap-2">
											{"count" in config && (
												<Badge variant="outline">{config.count} items</Badge>
											)}
											{feature === "summaries" && "length" in config && (
												<Badge variant="outline">{config.length} length</Badge>
											)}
											<Badge variant="outline" className="capitalize">
												{config.difficulty}
											</Badge>
											<Badge variant="outline" className="capitalize">
												{config.focus}
											</Badge>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* File Status Details (when uploading) */}
			{isUploading && files.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Upload Progress</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2 max-h-48 overflow-y-auto">
							{files.map((file) => (
								<div
									key={file.id}
									className="flex items-center justify-between text-sm"
								>
									<div className="flex items-center gap-2 flex-1 min-w-0">
										<span className="truncate">{file.file.name}</span>
									</div>
									<div className="flex items-center gap-2">
										{file.status === "pending" && (
											<Badge variant="secondary">Pending</Badge>
										)}
										{file.status === "uploading" && (
											<Badge variant="secondary" className="animate-pulse">
												Uploading
											</Badge>
										)}
										{file.status === "success" && (
											<Badge variant="default" className="bg-green-500">
												Success
											</Badge>
										)}
										{file.status === "error" && (
											<Badge variant="destructive">Failed</Badge>
										)}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
