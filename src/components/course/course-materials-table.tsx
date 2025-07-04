"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { GeneratedContentBadges } from "@/components/course/generated-content-badges";
import { MaterialStatusIndicator } from "@/components/course/material-status-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	courseMaterials,
	courseWeeks,
	courses,
} from "@/db/schema";
import { CONTENT_TYPES, CONTENT_TYPE_LABELS } from "@/lib/constants/file-upload";
import { AudioLines, File, FileText, Image, Link, Search, TrashIcon, Video } from "lucide-react";
import { useMemo, useState } from "react";

type CourseMaterialWithRelations = typeof courseMaterials.$inferSelect & {
	course?: Pick<typeof courses.$inferSelect, "name"> | null;
	courseWeek?: Pick<
		typeof courseWeeks.$inferSelect,
		"weekNumber" | "contentGenerationMetadata"
	> | null;
	publicAccessToken?: string | null;
};

interface CourseMaterialsTableProps {
	courseMaterials: CourseMaterialWithRelations[];
	isLoading: boolean;
	onDeleteMaterial: (materialId: string, materialName: string) => void;
	isDeleting: boolean;
}

export function CourseMaterialsTable({
	courseMaterials,
	isLoading,
	onDeleteMaterial,
	isDeleting,
}: CourseMaterialsTableProps) {
	const [searchTerm, setSearchTerm] = useState("");

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


	// Filter materials based on search term
	const filteredMaterials = courseMaterials.filter(
		(material) =>
			(material.fileName || material.title).toLowerCase().includes(searchTerm.toLowerCase()) ||
			material.course?.name?.toLowerCase().includes(searchTerm.toLowerCase())
	);

	// Sort materials by week number, then by name
	const sortedMaterials = useMemo(() => {
		return filteredMaterials.sort((a, b) => {
			const weekA = a.courseWeek?.weekNumber || 0;
			const weekB = b.courseWeek?.weekNumber || 0;
			if (weekA !== weekB) {
				return weekA - weekB;
			}
			return (a.fileName || a.title).localeCompare(b.fileName || b.title);
		});
	}, [filteredMaterials]);

	if (isLoading) {
		return (
			<div className="space-y-4 w-full">
				<div className="h-8 bg-muted animate-pulse rounded" />
				<div className="h-64 bg-muted animate-pulse rounded" />
			</div>
		);
	}

	return (
		<div className="space-y-4 w-full">
			<div className="flex justify-between items-center">
				<h2 className="text-lg font-semibold">Uploaded Materials</h2>
				<div className="relative w-72">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
					<Input
						placeholder="Search materials or courses..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-10"
					/>
				</div>
			</div>

			<div className="w-full rounded-lg border">
				<div className="relative w-full overflow-x-auto">
					<Table className="w-full caption-bottom text-sm">
						<TableHeader>
							<TableRow className="bg-muted/50">
								<TableHead className="w-20 whitespace-nowrap">Week</TableHead>
								<TableHead className="min-w-[150px] whitespace-nowrap">Course Name</TableHead>
								<TableHead className="min-w-[200px] whitespace-nowrap">Material Name</TableHead>
								<TableHead className="w-40 whitespace-nowrap">Processing Status</TableHead>
								<TableHead className="w-48 whitespace-nowrap">Generated Content</TableHead>
								<TableHead className="w-16 whitespace-nowrap" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedMaterials.length > 0 ? (
								sortedMaterials.map((material) => (
									<TableRow key={material.id}>
										<TableCell className="font-medium text-center whitespace-nowrap">
											<span className="text-sm font-medium">
												{material.courseWeek?.weekNumber
													? `Week ${material.courseWeek.weekNumber}`
													: "Unassigned"}
											</span>
										</TableCell>
										<TableCell className="font-medium">
											<span className="text-sm font-medium">
												{material.course?.name || "Unknown Course"}
											</span>
										</TableCell>
										<TableCell className="font-medium">
											<div className="flex items-center gap-2">
												{getContentTypeIcon(material.contentType || "pdf")}
												<div>
													<div>{material.fileName || material.title}</div>
													<div className="text-xs text-muted-foreground">
														{CONTENT_TYPE_LABELS[
															material.contentType as keyof typeof CONTENT_TYPE_LABELS
														] || "PDF Document"}
													</div>
												</div>
											</div>
										</TableCell>

										<TableCell>
											<MaterialStatusIndicator
												uploadStatus={material.uploadStatus || "pending"}
												embeddingStatus={material.embeddingStatus || "pending"}
												totalChunks={material.totalChunks || 0}
												embeddedChunks={material.embeddedChunks || 0}
												runId={material.runId || undefined}
												publicToken={material.publicAccessToken || undefined}
											/>
										</TableCell>

										<TableCell>
											<GeneratedContentBadges material={material} />
										</TableCell>

										<TableCell className="text-center whitespace-nowrap">
											<ConfirmDialog
												trigger={
													<Button
														variant="ghost"
														size="icon"
														disabled={isDeleting}
														className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-50"
													>
														<TrashIcon className={`h-4 w-4 ${isDeleting ? "animate-pulse" : ""}`} />
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
												disabled={isDeleting}
											/>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
										{searchTerm
											? "No materials found matching your search."
											: "No materials uploaded yet."}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</div>
	);
}
