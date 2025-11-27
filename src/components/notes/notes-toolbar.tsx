"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GoldenNote, Summary } from "@/hooks/use-notes";
import { type ExportType, exportNotes } from "@/lib/utils/export";
import { logger } from "@/lib/utils/logger";
import { Cloud, List, Menu } from "lucide-react";

interface NotesToolbarProps {
	activeTab: string;
	onTabChange: (tab: string) => void;
	goldenNotes: GoldenNote[];
	summaries: Summary[];
	courseName?: string;
	weekNumber?: number;
	materialTitle?: string;
}

export function NotesToolbar({
	activeTab,
	onTabChange,
	goldenNotes,
	summaries,
	courseName,
	weekNumber,
	materialTitle,
}: NotesToolbarProps) {
	const handleExport = async (type: ExportType) => {
		const exportData = {
			goldenNotes,
			summaries,
			courseName,
			weekNumber,
			materialTitle,
		};

		try {
			// Check if there's data to export
			if (goldenNotes.length === 0 && summaries.length === 0) {
				toast.error(
					"No data to export. Please select a course and week with content."
				);
				return;
			}

			exportNotes(type, exportData);
			toast.success(`Notes exported as ${type.toUpperCase()} successfully!`);
		} catch (error) {
			logger.error(
				{
					err: error,
					exportType: type,
					notesCount: goldenNotes.length + summaries.length,
				},
				"Failed to export notes"
			);
			toast.error(
				`Failed to export notes as ${type.toUpperCase()}. Please try again.`
			);
		}
	};

	return (
		<div className="flex items-center space-x-2">
			{/* Export dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="icon">
						<Cloud className="h-4 w-4" />
						<span className="sr-only">Export notes</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => handleExport("pdf")}>
						<span>Export as PDF</span>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleExport("csv")}>
						<span>Export as CSV</span>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleExport("json")}>
						<span>Export as JSON</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* View toggle buttons */}
			<Button
				variant={activeTab === "golden-notes" ? "default" : "outline"}
				size="icon"
				onClick={() => onTabChange("golden-notes")}
			>
				<List className="h-4 w-4" />
				<span className="sr-only">Toggle Golden Notes view</span>
			</Button>

			<Button
				variant={activeTab === "summaries" ? "default" : "outline"}
				size="icon"
				onClick={() => onTabChange("summaries")}
			>
				<Menu className="h-4 w-4" />
				<span className="sr-only">Toggle Summaries view</span>
			</Button>
		</div>
	);
}
