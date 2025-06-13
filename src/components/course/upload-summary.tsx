"use client";

import { BookOpen, Calendar, FileText, Globe } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { courses } from "@/db/schema";

interface UploadSummaryProps {
  course: typeof courses.$inferSelect | undefined;
  weekNumber: number;
  weekName: string;
  files: File[];
  outputLanguage: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  english: "🇺🇸 English", // supports english for now
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

export function UploadSummary({
  course,
  weekNumber,
  weekName,
  files,
  outputLanguage,
}: UploadSummaryProps) {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Upload Summary
        </CardTitle>
        <CardDescription>
          Review your selections before generating content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Course Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{course?.name}</p>
                <p className="text-xs text-muted-foreground">
                  Week {weekNumber}: {weekName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Output Language</p>
                <p className="text-xs text-muted-foreground">
                  {LANGUAGE_LABELS[outputLanguage] || outputLanguage}
                </p>
              </div>
            </div>
          </div>

          {/* Files Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {files.length} File{files.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total size: {formatFileSize(totalSize)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* File List */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Files to Process:</p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {files.map((file) => (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="flex items-center justify-between p-2 bg-background rounded-md border"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs truncate">{file.name}</span>
                </div>
                <Badge variant="secondary" className="text-xs ml-2">
                  {formatFileSize(file.size)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
