"use client";

import { CreateCourseDialog } from "@/components/course/create-course-dialog";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your progress.
          </p>
        </div>
        <CreateCourseDialog />
      </div>

    </div>
  );
}
