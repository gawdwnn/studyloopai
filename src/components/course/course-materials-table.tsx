"use client";

import { CourseMaterialRow } from "@/components/course/course-material-row";
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
								<TableHead className="min-w-[150px] whitespace-nowrap">
									Course Name
								</TableHead>
								<TableHead className="min-w-[200px] whitespace-nowrap">
									Material Name
								</TableHead>
								<TableHead className="w-40 whitespace-nowrap">Status</TableHead>
								<TableHead className="w-16 whitespace-nowrap text-center">
									Notes
								</TableHead>
								<TableHead className="w-16 whitespace-nowrap text-center">
									Summaries
								</TableHead>
								<TableHead className="w-16 whitespace-nowrap text-center">
									Cuecards
								</TableHead>
								<TableHead className="w-16 whitespace-nowrap text-center">
									MCQs
								</TableHead>
								<TableHead className="w-16 whitespace-nowrap text-center">
									Open Questions
								</TableHead>
								<TableHead className="w-16 whitespace-nowrap text-center">
									Concept Maps
								</TableHead>
								<TableHead className="w-16 whitespace-nowrap" />
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
										/>
									);
								})
							) : (
								<TableRow>
									<TableCell
										colSpan={11}
										className="text-center py-8 text-muted-foreground"
									>
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
