"use client";

import { AlertCircle, FilePlus2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { CourseSelectorButton } from "@/components/notes/course-selector-button";
import { MarkdownRenderer } from "@/components/notes/markdown-renderer";
import { NoteCard } from "@/components/notes/note-card";
import { NotesSkeletonLoader } from "@/components/notes/notes-skeleton-loader";
import { NotesToolbar } from "@/components/notes/notes-toolbar";
import { UserNotesEditor } from "@/components/notes/user-notes-editor";
import { WeekCarousel } from "@/components/notes/week-carousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type GoldenNote, type Summary, useNotesData, useUserCourses } from "@/hooks/use-notes";
import { handleApiError, shouldShowRetry } from "@/lib/utils/error-handling";
import Link from "next/link";

export default function NotesPage() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const { data: courses = [], isLoading: isLoadingCourses } = useUserCourses();

	const selectedCourseId = useMemo(() => searchParams.get("courseId") || "", [searchParams]);
	const selectedWeek = useMemo(() => Number(searchParams.get("week") || 1), [searchParams]);
	const activeTab = useMemo(() => searchParams.get("tab") || "golden-notes", [searchParams]);

	const updateQueryParam = useCallback(
		(key: string, value: string | number) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set(key, String(value));
			router.push(`${pathname}?${params.toString()}`);
		},
		[pathname, router, searchParams]
	);

	// Auto-select first course if none is selected
	useEffect(() => {
		if (!selectedCourseId && courses.length > 0) {
			updateQueryParam("courseId", courses[0].id);
		}
	}, [courses, selectedCourseId, updateQueryParam]);

	// Initially fetch with empty weekId to get all weeks
	const {
		data: notesPageData,
		isLoading: isLoadingNotes,
		error,
		refetch,
	} = useNotesData(selectedCourseId, "");

	const weeks = notesPageData?.weeks || [];
	const selectedWeekId = useMemo(
		() => weeks.find((w) => w.weekNumber === selectedWeek)?.id || "",
		[weeks, selectedWeek]
	);

	const {
		data: weekSpecificData,
		isLoading: isLoadingWeekNotes,
		error: weekError,
		refetch: refetchWeek,
	} = useNotesData(selectedCourseId, selectedWeekId, {
		enabled: !!selectedWeekId,
	});

	const goldenNotes = weekSpecificData?.goldenNotes || notesPageData?.goldenNotes || [];
	const summaries = weekSpecificData?.summaries || notesPageData?.summaries || [];

	const selectedWeekData = weeks.find((w) => w.weekNumber === selectedWeek);
	const materialTitle = selectedWeekData?.materialTitle || "No materials for this week";
	const selectedCourse = courses.find((course) => course.id === selectedCourseId);

	const isLoading =
		isLoadingCourses ||
		(selectedCourseId && (isLoadingNotes || (selectedWeekId && isLoadingWeekNotes)));

	// Enhanced empty state for when no courses exist
	if (!isLoading && courses.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
				<FilePlus2 className="h-20 w-20 text-muted-foreground mb-6" />
				<h2 className="text-2xl font-bold tracking-tight mb-2">No Courses Found</h2>
				<p className="text-muted-foreground mb-6 max-w-md">
					It looks like you haven&apos;t created any courses yet. Create your first course to start
					generating and managing your study notes.
				</p>
				<Button asChild>
					<Link href="/dashboard/courses">Create a New Course</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Toolbar with course selector and actions */}
			<div className="flex items-center justify-between">
				<CourseSelectorButton
					onCourseSelect={(id) => updateQueryParam("courseId", id)}
					selectedCourseId={selectedCourseId}
				/>

				{selectedCourseId && (
					<NotesToolbar
						activeTab={activeTab}
						onTabChange={(tab) => updateQueryParam("tab", tab)}
						goldenNotes={goldenNotes}
						summaries={summaries}
						courseName={selectedCourse?.name}
						weekNumber={selectedWeek}
						materialTitle={materialTitle}
					/>
				)}
			</div>

			{!selectedCourseId && !isLoading && (
				<div className="flex flex-col items-center justify-center h-[calc(100vh-400px)] text-center">
					<h2 className="text-2xl font-bold tracking-tight mb-2">Select a Course</h2>
					<p className="text-muted-foreground mb-6 max-w-md">
						Please select a course from the dropdown above to view its notes.
					</p>
				</div>
			)}
			{selectedCourseId && (
				<>
					<WeekCarousel
						weeks={weeks.map((w) => ({
							weekNumber: w.weekNumber,
							title: w.materialTitle,
						}))}
						onWeekSelect={(week) => updateQueryParam("week", week)}
						selectedWeek={selectedWeek}
					/>

					<Card>
						<CardHeader>
							<div className="flex items-start justify-between">
								<h2 className="text-xl font-semibold tracking-tight">{materialTitle}</h2>
								<p className="text-sm text-muted-foreground">WEEK {selectedWeek}</p>
							</div>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<NotesSkeletonLoader />
							) : error || weekError ? (
								<div className="text-center py-8">
									<AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
									<h3 className="text-lg font-semibold mb-2">Unable to load notes</h3>
									<p className="text-muted-foreground mb-4">
										{handleApiError(error || weekError, "load notes")}
									</p>
									{shouldShowRetry(error || weekError) && (
										<Button
											variant="outline"
											onClick={() => (weekError ? refetchWeek() : refetch())}
										>
											Try Again
										</Button>
									)}
								</div>
							) : (
								<Tabs
									value={activeTab}
									onValueChange={(tab) => updateQueryParam("tab", tab)}
									className="w-full"
								>
									<TabsList>
										<TabsTrigger value="golden-notes">
											Golden Notes ({goldenNotes.length})
										</TabsTrigger>
										<TabsTrigger value="summaries">Summaries ({summaries.length})</TabsTrigger>
										<TabsTrigger value="own-notes">Own Notes</TabsTrigger>
									</TabsList>

									<TabsContent value="golden-notes" className="pt-6">
										{goldenNotes.length > 0 ? (
											<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
												{goldenNotes.map((note: GoldenNote) => (
													<NoteCard
														key={note.id}
														noteId={note.id}
														title={note.title}
														content={note.content}
														version={note.version}
														withActions={true}
														withMarkdown={true}
													/>
												))}
											</div>
										) : (
											<div className="flex h-40 items-center justify-center rounded-md border border-dashed">
												<p className="text-muted-foreground">
													No golden notes available for this week yet.
												</p>
											</div>
										)}
									</TabsContent>

									<TabsContent value="summaries" className="pt-6">
										{summaries.length > 0 ? (
											<div className="space-y-4">
												{summaries.map((summary: Summary) => (
													<Card key={summary.id}>
														<CardHeader>
															<div className="flex items-start justify-between">
																<h3 className="text-lg font-semibold">
																	{summary.title || "Summary"}
																</h3>
																<div className="text-sm text-muted-foreground">
																	{summary.summaryType && (
																		<span className="capitalize">{summary.summaryType}</span>
																	)}
																	{summary.wordCount && (
																		<span className="ml-2">({summary.wordCount} words)</span>
																	)}
																</div>
															</div>
														</CardHeader>
														<CardContent>
															<MarkdownRenderer content={summary.content} />
														</CardContent>
													</Card>
												))}
											</div>
										) : (
											<div className="flex h-40 items-center justify-center rounded-md border border-dashed">
												<p className="text-muted-foreground">
													No summaries available for this week yet.
												</p>
											</div>
										)}
									</TabsContent>

									<TabsContent value="own-notes" className="pt-6">
										<UserNotesEditor courseId={selectedCourseId} weekId={selectedWeekId} />
									</TabsContent>
								</Tabs>
							)}
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
