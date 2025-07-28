import { FilePlus2 } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { getUserCourses } from "@/lib/actions/courses";
import { getAllCourseNotesData } from "@/lib/actions/notes";
import { NotesClient } from "./notes-client";

export const metadata = {
	title: "Notes - StudyLoop AI",
	description:
		"Access your AI-generated golden notes, summaries, and personal notes.",
};

interface NotesPageProps {
	searchParams: Promise<{
		courseId?: string;
		week?: string;
		tab?: string;
	}>;
}

export default async function NotesPage({ searchParams }: NotesPageProps) {
	// Await searchParams in Next.js 15
	const resolvedSearchParams = await searchParams;
	// Fetch data server-side
	const courses = await getUserCourses();

	// Handle empty courses state
	if (courses.length === 0) {
		return (
			<EmptyState
				icon={FilePlus2}
				title="Create a Course to Get Started"
				description="You need to create a course first before you can access your study notes and AI-generated content."
			>
				<Button asChild>
					<Link href="/dashboard?action=create">Create a New Course</Link>
				</Button>
			</EmptyState>
		);
	}

	// Get initial course ID (from URL or first course)
	const initialCourseId = resolvedSearchParams.courseId || courses[0].id;
	const initialWeek = Number(resolvedSearchParams.week) || 1;
	const initialTab = resolvedSearchParams.tab || "golden-notes";

	// Fetch initial notes data for the selected/first course
	const initialNotesData = await getAllCourseNotesData(initialCourseId);

	// Render notes page with server-side data
	return (
		<div className="space-y-6">
			<PageHeading
				title="Study Notes"
				description="Access your AI-generated golden notes, summaries, and personal notes"
			/>

			<NotesClient
				courses={courses}
				initialNotesData={initialNotesData}
				initialCourseId={initialCourseId}
				initialWeek={initialWeek}
				initialTab={initialTab}
			/>
		</div>
	);
}
