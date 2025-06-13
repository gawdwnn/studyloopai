"use client";

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
  ProcessingMetadata,
  courseMaterials,
  courseWeeks,
  courses,
} from "@/db/schema";
import { Search, TrashIcon } from "lucide-react";
import { useState } from "react";

// Type for course materials with relations
type CourseMaterialWithRelations = typeof courseMaterials.$inferSelect & {
  course?: Pick<typeof courses.$inferSelect, "name"> | null;
  week?: Pick<typeof courseWeeks.$inferSelect, "weekNumber"> | null;
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

  // Helper function to get processing metadata with fallback
  const getProcessingData = (material: CourseMaterialWithRelations) => {
    const metadata = material.processingMetadata as ProcessingMetadata | null;
    return {
      flashcards: metadata?.flashcards || { total: 0, completed: 0 },
      multipleChoice: metadata?.multipleChoice || { total: 0, completed: 0 },
      openQuestions: metadata?.openQuestions || { total: 0, completed: 0 },
      summaries: metadata?.summaries || { total: 0, completed: 0 },
    };
  };

  // Filter materials based on search term
  const filteredMaterials = courseMaterials.filter(
    (material) =>
      (material.fileName || material.title)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      material.course?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <TableHead className="w-16 whitespace-nowrap">Week</TableHead>
                <TableHead className="min-w-[200px] whitespace-nowrap">
                  PDF Name
                </TableHead>
                <TableHead className="text-center w-32 whitespace-nowrap">
                  Golden Notes Flashcards
                </TableHead>
                <TableHead className="text-center w-32 whitespace-nowrap">
                  Multiple Choice Exercises
                </TableHead>
                <TableHead className="text-center w-32 whitespace-nowrap">
                  Open Questions
                </TableHead>
                <TableHead className="text-center w-32 whitespace-nowrap">
                  Summaries
                </TableHead>
                <TableHead className="w-16 whitespace-nowrap" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map((material) => {
                  const processingData = getProcessingData(material);

                  return (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium text-center whitespace-nowrap">
                        {material.week?.weekNumber || "N/A"}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        <div>
                          <div>{material.fileName || material.title}</div>
                          {material.course && (
                            <div className="text-xs text-muted-foreground">
                              {material.course.name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {processingData.flashcards.total}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {processingData.flashcards.completed}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {processingData.multipleChoice.total}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {processingData.multipleChoice.completed}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {processingData.openQuestions.total}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {processingData.openQuestions.completed}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {processingData.summaries.total}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {processingData.summaries.completed}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            onDeleteMaterial(
                              material.id,
                              material.fileName || material.title
                            )
                          }
                          disabled={isDeleting}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-50"
                        >
                          <TrashIcon
                            className={`h-4 w-4 ${isDeleting ? "animate-pulse" : ""}`}
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
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
