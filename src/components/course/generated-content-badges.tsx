"use client";

import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	Course,
	CourseMaterial,
	CourseWeek,
} from "@/types/database-types";

type CourseMaterialWithRelations = CourseMaterial & {
	course?: Pick<Course, "name"> | null;
	courseWeek?: Pick<CourseWeek, "weekNumber"> | null;
};

interface GeneratedContentBadgesProps {
	material: CourseMaterialWithRelations;
	contentCounts?: {
		cuecards: number;
		mcqs: number;
		openQuestions: number;
		summaries: number;
		goldenNotes: number;
		conceptMaps: number;
	};
}

interface ContentBadgeProps {
	count: number;
	emoji: string;
	label: string;
}

function ContentBadge({ count, emoji, label }: ContentBadgeProps) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge variant="outline" className="text-xs shrink-0 cursor-help">
						{emoji} {count}
					</Badge>
				</TooltipTrigger>
				<TooltipContent>
					<p>
						{count} {label}
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export function GeneratedContentBadges({
	contentCounts,
}: GeneratedContentBadgesProps) {
	// TODO: Integrate with content-availability-service to show per-material content counts
	// Need to query AI content tables (cuecards, summaries, mcqs, etc.) filtered by:
	// - courseId and weekId (from material)
	// - Generated from this specific material (requires tracking material source in AI tables)
	// This will show which content types and counts have been generated for each material

	if (!contentCounts) {
		return (
			<Badge variant="secondary" className="text-xs">
				Content tracking pending
			</Badge>
		);
	}

	const totalGenerated = Object.values(contentCounts).reduce(
		(sum, count) => sum + count,
		0
	);

	if (totalGenerated === 0) {
		return (
			<Badge variant="secondary" className="text-xs">
				No content generated
			</Badge>
		);
	}

	return (
		<div className="flex flex-wrap gap-1 items-center">
			{contentCounts.goldenNotes > 0 && (
				<ContentBadge
					count={contentCounts.goldenNotes}
					emoji="📝"
					label="Study Notes"
				/>
			)}
			{contentCounts.cuecards > 0 && (
				<ContentBadge
					count={contentCounts.cuecards}
					emoji="🃏"
					label="Cuecards"
				/>
			)}
			{contentCounts.mcqs > 0 && (
				<ContentBadge
					count={contentCounts.mcqs}
					emoji="❓"
					label="Multiple Choice Questions"
				/>
			)}
			{contentCounts.openQuestions > 0 && (
				<ContentBadge
					count={contentCounts.openQuestions}
					emoji="💭"
					label="Open Questions"
				/>
			)}
			{contentCounts.summaries > 0 && (
				<ContentBadge
					count={contentCounts.summaries}
					emoji="📄"
					label="Summaries"
				/>
			)}
			{contentCounts.conceptMaps > 0 && (
				<ContentBadge
					count={contentCounts.conceptMaps}
					emoji="🗺️"
					label="Concept Maps"
				/>
			)}
		</div>
	);
}
