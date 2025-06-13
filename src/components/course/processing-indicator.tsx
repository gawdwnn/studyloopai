"use client";

import { AlertCircle, CheckCircle, Clock, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface ProcessingJob {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

interface ProcessingIndicatorProps {
  jobs: ProcessingJob[];
  onDismiss: (jobId: string) => void;
  className?: string;
}

export function ProcessingIndicator({
  jobs,
  onDismiss,
  className = "",
}: ProcessingIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(jobs.length > 0);
  }, [jobs.length]);

  if (!isVisible || jobs.length === 0) {
    return null;
  }

  const getStatusIcon = (status: ProcessingJob["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: ProcessingJob["status"]) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "processing":
        return "default";
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000);

    if (duration < 60) {
      return `${duration}s`;
    }
    if (duration < 3600) {
      return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    }
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm space-y-2 ${className}`}
    >
      {jobs.map((job) => (
        <Card key={job.id} className="shadow-lg border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getStatusIcon(job.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={getStatusColor(job.status)}
                      className="text-xs"
                    >
                      {job.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(job.startTime, job.endTime)}
                    </span>
                  </div>

                  {job.status === "processing" &&
                    job.progress !== undefined && (
                      <div className="mt-2">
                        <Progress value={job.progress} className="h-1" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {job.progress}% complete
                        </p>
                      </div>
                    )}

                  {job.status === "failed" && job.error && (
                    <p className="text-xs text-red-600 mt-1 line-clamp-2">
                      {job.error}
                    </p>
                  )}

                  {job.status === "completed" && (
                    <p className="text-xs text-green-600 mt-1">
                      Content generation completed successfully
                    </p>
                  )}
                </div>
              </div>

              {(job.status === "completed" || job.status === "failed") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(job.id)}
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Hook for managing processing jobs
export function useProcessingJobs() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);

  const addJob = (job: Omit<ProcessingJob, "id" | "startTime">) => {
    const newJob: ProcessingJob = {
      ...job,
      id: crypto.randomUUID(),
      startTime: new Date(),
    };

    setJobs((prev) => [...prev, newJob]);
    return newJob.id;
  };

  const updateJob = (id: string, updates: Partial<ProcessingJob>) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id
          ? {
              ...job,
              ...updates,
              endTime:
                updates.status === "completed" || updates.status === "failed"
                  ? new Date()
                  : job.endTime,
            }
          : job
      )
    );
  };

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== id));
  };

  const dismissJob = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (job && (job.status === "completed" || job.status === "failed")) {
      removeJob(id);
    }
  };

  return {
    jobs,
    addJob,
    updateJob,
    removeJob,
    dismissJob,
  };
}
