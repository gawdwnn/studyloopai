"use client";

import { CourseMaterialRow } from "@/components/course/course-material-row";
import { COURSE_MATERIAL_COLUMNS } from "@/components/course/table-column-config";
import { useResponsiveColumns } from "@/components/table/hooks/use-responsive-columns";
import { useTableScroll } from "@/components/table/hooks/use-table-scroll";
import { TableScrollControls } from "@/components/table/table-scroll-controls";
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
	Course,
	CourseMaterial,
	CourseWeek,
} from "@/types/database-types";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type CourseMaterialWithRelations = CourseMaterial & {
	course?: Pick<Course, "name"> | null;
	courseWeek?: Pick<CourseWeek, "weekNumber"> | null;
};

interface CourseMaterialsTableProps {
	courseMaterials: CourseMaterialWithRelations[];
	onDeleteMaterial: (materialId: string, materialName: string) => void;
	isDeleting: boolean;
	deletingMaterials?: Set<string>;
}

export function CourseMaterialsTable({
	courseMaterials,
	onDeleteMaterial,
	isDeleting,
	deletingMaterials = new Set(),
}: CourseMaterialsTableProps) {
	const [searchTerm, setSearchTerm] = useState("");

	// Responsive columns and table scroll
	const { visibleColumns, isMobile } = useResponsiveColumns(
		COURSE_MATERIAL_COLUMNS
	);
	const {
		containerRef,
		canScrollLeft,
		canScrollRight,
		isScrollable,
		scrollLeft,
		scrollRight,
	} = useTableScroll({ scrollAmount: 150 });

	// Filter materials based on search term
	const filteredMaterials = courseMaterials.filter(
		(material) =>
			(material.fileName || material.title)
				.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
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

	return (
		<div className="space-y-4 w-full">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div className="flex items-center justify-between w-full sm:w-auto">
					<h2 className="text-lg font-semibold">Uploaded Materials</h2>
					{isScrollable && (
						<TableScrollControls
							canScrollLeft={canScrollLeft}
							canScrollRight={canScrollRight}
							onScrollLeft={scrollLeft}
							onScrollRight={scrollRight}
							className="sm:hidden"
						/>
					)}
				</div>
				<div className="flex items-center gap-3 w-full sm:w-auto">
					<div className="relative flex-1 sm:w-72">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
						<Input
							placeholder="Search materials or courses..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
					{isScrollable && (
						<TableScrollControls
							canScrollLeft={canScrollLeft}
							canScrollRight={canScrollRight}
							onScrollLeft={scrollLeft}
							onScrollRight={scrollRight}
							className="hidden sm:flex"
						/>
					)}
				</div>
			</div>

			<div className="w-full rounded-lg border">
				<div ref={containerRef} className="relative w-full overflow-x-auto">
					<Table className="w-full caption-bottom text-sm">
						<TableHeader>
							<TableRow className="bg-muted/50">
								{visibleColumns.map((column) => (
									<TableHead key={column.id} className={column.headerClassName}>
										{column.label}
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedMaterials.length > 0 ? (
								sortedMaterials.map((material) => {
									return (
										<CourseMaterialRow
											key={material.id}
											material={material}
											onDeleteMaterial={onDeleteMaterial}
											isDeleting={isDeleting}
											isBeingDeleted={deletingMaterials.has(material.id)}
											visibleColumns={visibleColumns}
											isMobile={isMobile}
										/>
									);
								})
							) : (
								<TableRow>
									<TableCell
										colSpan={visibleColumns.length}
										className="text-center py-8 text-muted-foreground"
									>
										{searchTerm
											? "No course materials found matching your search."
											: "No course materials uploaded yet."}
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
