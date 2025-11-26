import { getAllUserMaterials, getUserCourses } from "@/lib/actions/courses";
import { FilePlus2, FileX } from "lucide-react";
import Link from "next/link";

import { UploadWizard } from "@/components/course/upload-wizard";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { getUserPlan } from "@/lib/actions/plans";
import type { UserPlan } from "@/lib/document-processor/types";
import { CourseMaterialsClient } from "./course-materials-client";

export const metadata = {
	title: "Course Materials - StudyLoop AI",
	description: "Manage your uploaded course materials and generated content.",
};

export default async function CourseMaterialsPage() {
	// Fetch data server-side
	const [courses, courseMaterials, planRow] = await Promise.all([
		getUserCourses(),
		getAllUserMaterials(),
		getUserPlan(),
	]);
	const userPlan = (planRow?.planId as UserPlan) ?? "free";

	// Handle no courses state
	if (courses.length === 0) {
		return (
			<EmptyState
				icon={FilePlus2}
				title="Create a Course to Get Started"
				description="You need to create a course first before you can upload and manage your study materials."
			>
				<Button asChild>
					<Link href="/dashboard?action=create">Create a New Course</Link>
				</Button>
			</EmptyState>
		);
	}

	// Handle empty materials state
	if (courseMaterials.length === 0) {
		return (
			<div className="space-y-6">
				<PageHeading
					title="Course Materials"
					description="Manage your uploaded course materials and generated content."
				>
					<UploadWizard courses={courses} userPlan={userPlan} />
				</PageHeading>

				<EmptyState
					icon={FileX}
					title="No Materials Uploaded Yet"
					description="Upload your first course material to start generating AI-powered study content like notes, cuecards, and quizzes."
				>
					<UploadWizard courses={courses} userPlan={userPlan} />
				</EmptyState>
			</div>
		);
	}

	// Render materials table with client-side interactions
	return (
		<div className="space-y-6">
			<PageHeading
				title="Course Materials"
				description="Manage your uploaded course materials and generated content."
			>
				<UploadWizard courses={courses} userPlan={userPlan} />
			</PageHeading>

			<CourseMaterialsClient
				courses={courses}
				initialMaterials={courseMaterials}
			/>
		</div>
	);
}
