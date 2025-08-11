"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { CourseWeekFeature } from "@/components/course/course-week-feature";
import { EnhancedMaterialStatus } from "@/components/course/enhanced-material-status";
import type { TableColumn } from "@/components/course/table-column-config";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { useFeatureAvailability } from "@/hooks/use-feature-availability";
import {
	CONTENT_TYPES,
	CONTENT_TYPE_LABELS,
} from "@/lib/config/document-processing";
import type {
	Course,
	CourseMaterial,
	CourseWeek,
} from "@/types/database-types";
import {
	AudioLines,
	File,
	FileText,
	Image,
	Link,
	TrashIcon,
	Video,
} from "lucide-react";

type CourseMaterialWithRelations = CourseMaterial & {
	course?: Pick<Course, "name"> | null;
	courseWeek?: Pick<CourseWeek, "weekNumber"> | null;
};

interface CourseMaterialRowProps {
	material: CourseMaterialWithRelations;
	onDeleteMaterial: (materialId: string, materialName: string) => void;
	isDeleting: boolean;
	isBeingDeleted: boolean;
	visibleColumns: TableColumn[];
	isMobile: boolean;
}

export function CourseMaterialRow({
	material,
	onDeleteMaterial,
	isDeleting,
	isBeingDeleted,
	visibleColumns,
	isMobile,
}: CourseMaterialRowProps) {
	const { data, isLoading } = useFeatureAvailability(
		material.courseId,
		material.weekId
	);
	const weekFeatures = data ?? null;

	// Get processing job for this material

	// Helper function to get content type icon
	const getContentTypeIcon = (contentType: string) => {
		switch (contentType) {
			case CONTENT_TYPES.PDF:
				return <FileText className="h-4 w-4 text-red-500" />;
			case CONTENT_TYPES.VIDEO:
				return <Video className="h-4 w-4 text-blue-500" />;
			case CONTENT_TYPES.AUDIO:
				return <AudioLines className="h-4 w-4 text-green-500" />;
			case CONTENT_TYPES.IMAGE:
				return <Image className="h-4 w-4 text-purple-500" />;
			case CONTENT_TYPES.WEBLINK:
				return <Link className="h-4 w-4 text-cyan-500" />;
			default:
				return <File className="h-4 w-4 text-gray-500" />;
		}
	};

	// Render cell content based on column type
	const renderCellContent = (columnId: string) => {
		switch (columnId) {
			case "week":
				return (
					<span className="text-sm font-medium">
						{material.courseWeek?.weekNumber
							? `Week ${material.courseWeek.weekNumber}`
							: "Unassigned"}
					</span>
				);
			case "courseName":
				return (
					<span className="text-sm font-medium">
						{material.course?.name || "Unknown Course"}
					</span>
				);
			case "materialName":
				return (
					<div className="flex items-center gap-2">
						{getContentTypeIcon(material.contentType || "pdf")}
						<div className="min-w-0 flex-1">
							<div className="truncate">
								{material.fileName || material.title}
							</div>
							{!isMobile && (
								<div className="text-xs text-muted-foreground">
									{CONTENT_TYPE_LABELS[
										material.contentType as keyof typeof CONTENT_TYPE_LABELS
									] || "PDF Document"}
								</div>
							)}
						</div>
					</div>
				);
			case "status":
				return <EnhancedMaterialStatus courseMaterial={material} />;
			case "notes":
				return (
					<CourseWeekFeature
						weekFeatures={weekFeatures}
						featureType="goldenNotes"
						isLoading={isLoading}
					/>
				);
			case "summaries":
				return (
					<CourseWeekFeature
						weekFeatures={weekFeatures}
						featureType="summaries"
						isLoading={isLoading}
					/>
				);
			case "cuecards":
				return (
					<CourseWeekFeature
						weekFeatures={weekFeatures}
						featureType="cuecards"
						isLoading={isLoading}
					/>
				);
			case "mcqs":
				return (
					<CourseWeekFeature
						weekFeatures={weekFeatures}
						featureType="mcqs"
						isLoading={isLoading}
					/>
				);
			case "openQuestions":
				return (
					<CourseWeekFeature
						weekFeatures={weekFeatures}
						featureType="openQuestions"
						isLoading={isLoading}
					/>
				);
			case "conceptMaps":
				return (
					<CourseWeekFeature
						weekFeatures={weekFeatures}
						featureType="conceptMaps"
						isLoading={isLoading}
					/>
				);
			case "actions":
				return isBeingDeleted ? (
					<div className="flex items-center justify-center h-8 w-8">
						<div className="h-4 w-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
					</div>
				) : (
					<ConfirmDialog
						trigger={
							<Button
								variant="ghost"
								size="icon"
								disabled={isDeleting || isBeingDeleted}
								className="h-8 w-8 text-muted-foreground disabled:opacity-50"
							>
								<TrashIcon className="h-4 w-4" />
							</Button>
						}
						title="Delete Course Material"
						description={`Are you sure you want to delete "${material.fileName || material.title}"? This action cannot be undone and will also remove all learning features.`}
						confirmText="Delete"
						cancelText="Cancel"
						variant="destructive"
						onConfirm={() =>
							onDeleteMaterial(material.id, material.fileName || material.title)
						}
						isLoading={isDeleting}
						disabled={isDeleting || isBeingDeleted}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<TableRow
			className={`transition-all duration-300 ${
				isBeingDeleted
					? "opacity-50 bg-destructive/5 animate-pulse"
					: "hover:bg-muted/50"
			}`}
		>
			{visibleColumns.map((column) => (
				<TableCell key={column.id} className={column.className}>
					{renderCellContent(column.id)}
				</TableCell>
			))}
		</TableRow>
	);
}
