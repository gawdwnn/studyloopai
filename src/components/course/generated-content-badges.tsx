"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  WeekContentGenerationMetadata,
  courseMaterials,
  courseWeeks,
} from "@/db/schema";

type CourseMaterialWithRelations = typeof courseMaterials.$inferSelect & {
  courseWeek?: Pick<
    typeof courseWeeks.$inferSelect,
    "weekNumber" | "contentGenerationMetadata"
  > | null;
};

interface GeneratedContentBadgesProps {
  material: CourseMaterialWithRelations;
}

// Helper function to get content generation data from week-level metadata
function getContentGenerationData(material: CourseMaterialWithRelations) {
  const weekMetadata = material.courseWeek
    ?.contentGenerationMetadata as WeekContentGenerationMetadata | null;
  const contentCounts = weekMetadata?.generationResults?.contentCounts;

  return {
    flashcards: {
      count: contentCounts?.flashcards || 0,
      success: (contentCounts?.flashcards || 0) > 0,
    },
    multipleChoice: {
      count: contentCounts?.mcqs || 0,
      success: (contentCounts?.mcqs || 0) > 0,
    },
    openQuestions: {
      count: contentCounts?.openQuestions || 0,
      success: (contentCounts?.openQuestions || 0) > 0,
    },
    summaries: {
      count: contentCounts?.summaries || 0,
      success: (contentCounts?.summaries || 0) > 0,
    },
    goldenNotes: {
      count: contentCounts?.goldenNotes || 0,
      success: (contentCounts?.goldenNotes || 0) > 0,
    },
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
  material,
}: GeneratedContentBadgesProps) {
  const processingData = getContentGenerationData(material);
  const totalGenerated = Object.values(processingData).reduce(
    (sum, item) => sum + (item.count || 0),
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
      {processingData.goldenNotes.count > 0 && (
        <ContentBadge
          count={processingData.goldenNotes.count}
          emoji="📝"
          label="Study Notes"
        />
      )}
      {processingData.flashcards.count > 0 && (
        <ContentBadge
          count={processingData.flashcards.count}
          emoji="🃏"
          label="Flashcards"
        />
      )}
      {processingData.multipleChoice.count > 0 && (
        <ContentBadge
          count={processingData.multipleChoice.count}
          emoji="❓"
          label="Multiple Choice Questions"
        />
      )}
      {processingData.openQuestions.count > 0 && (
        <ContentBadge
          count={processingData.openQuestions.count}
          emoji="💭"
          label="Open Questions"
        />
      )}
      {processingData.summaries.count > 0 && (
        <ContentBadge
          count={processingData.summaries.count}
          emoji="📄"
          label="Summaries"
        />
      )}
    </div>
  );
}
