"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  progress: number;
  className?: string;
}

export function UploadProgress({ progress, className }: UploadProgressProps) {
  return (
    <div className={cn("w-full", className)}>
      <p className="text-sm font-medium text-muted-foreground mb-2">
        Uploading...
      </p>
      <Progress value={progress} />
      <p className="text-xs text-muted-foreground mt-1">
        {Math.round(progress)}%
      </p>
    </div>
  );
}
