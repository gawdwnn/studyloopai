"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useMemo } from "react";

import { FullscreenProvider } from "@/components/fullscreen-context";
import { CourseSelectorButton } from "@/components/notes/course-selector-button";
import { MDXRenderer } from "@/components/notes/mdx-renderer";
import { NoteCard } from "@/components/notes/note-card";
import { NotesSkeletonLoader } from "@/components/notes/notes-skeleton-loader";
import { NotesToolbar } from "@/components/notes/notes-toolbar";
import { UserNotesEditor } from "@/components/notes/user-notes-editor";
import { WeekCarousel } from "@/components/notes/week-carousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	type GoldenNote,
	type NotesData,
	type Summary,
	useUnifiedNotesData,
} from "@/hooks/use-notes";
import { useQueryState } from "@/hooks/use-query-state";

interface Course {
	id: string;
	name: string;
}

interface NotesClientProps {
	courses: Course[];
	initialNotesData: NotesData;
	initialCourseId: string;
	initialWeek: number;
	initialTab: string;
}

export function NotesClient({
	courses,
	initialNotesData,
	initialCourseId,
	initialWeek,
	initialTab,
}: NotesClientProps) {
	const { searchParams, setQueryState } = useQueryState();

	const selectedCourseId = useMemo(
		() => searchParams.get("courseId") || initialCourseId,
		[searchParams, initialCourseId]
	);
	const selectedWeek = useMemo(
		() => Number(searchParams.get("week") || initialWeek),
		[searchParams, initialWeek]
	);
	const activeTab = useMemo(
		() => searchParams.get("tab") || initialTab,
		[searchParams, initialTab]
	);

	// Unified query that fetches all course data and filters client-side
	const {
		data: notesData,
		isLoading,
		error,
		refetch,
	} = useUnifiedNotesData(selectedCourseId, {
		initialData:
			selectedCourseId === initialCourseId ? initialNotesData : undefined,
	});

	const weeks = notesData?.weeks || [];
	const selectedWeekId = useMemo(
		() => weeks.find((w) => w.weekNumber === selectedWeek)?.id || "",
		[weeks, selectedWeek]
	);

	// Get filtered data for the specific week
	const weekFilteredData = useMemo(() => {
		if (!selectedWeekId || !notesData) {
			return { goldenNotes: [], summaries: [] };
		}
		return {
			goldenNotes: notesData.goldenNotes.filter(
				(note) => note.weekId === selectedWeekId
			),
			summaries: notesData.summaries.filter(
				(summary) => summary.weekId === selectedWeekId
			),
		};
	}, [notesData, selectedWeekId]);

	const goldenNotes = weekFilteredData.goldenNotes;
	const summaries = weekFilteredData.summaries;

	const selectedWeekData = weeks.find((w) => w.weekNumber === selectedWeek);
	const materialTitle =
		selectedWeekData?.materialTitle || "No materials for this week";
	const selectedCourse = courses.find(
		(course) => course.id === selectedCourseId
	);

	// Update URL params if they don't match current state
	useEffect(() => {
		const currentCourseId = searchParams.get("courseId");
		const currentWeek = searchParams.get("week");
		const currentTab = searchParams.get("tab");

		if (
			currentCourseId !== selectedCourseId ||
			currentWeek !== selectedWeek.toString() ||
			currentTab !== activeTab
		) {
			setQueryState({
				courseId: selectedCourseId,
				week: selectedWeek,
				tab: activeTab,
			});
		}
	}, [searchParams, selectedCourseId, selectedWeek, activeTab, setQueryState]);

	return (
		<div className="space-y-6">
			{/* Toolbar with course selector and actions */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<CourseSelectorButton
					onCourseSelect={(id) => setQueryState({ courseId: id, week: 1 })}
					selectedCourseId={selectedCourseId}
				/>

				{selectedCourseId && (
					<div className="w-full sm:w-auto">
						<NotesToolbar
							activeTab={activeTab}
							onTabChange={(tab) => setQueryState({ tab })}
							goldenNotes={goldenNotes}
							summaries={summaries}
							courseName={selectedCourse?.name}
							weekNumber={selectedWeek}
							materialTitle={materialTitle}
						/>
					</div>
				)}
			</div>

			{!selectedCourseId && (
				<div className="flex flex-col items-center justify-center h-[calc(100vh-400px)] text-center">
					<h2 className="text-xl font-bold tracking-tight mb-2 sm:text-2xl">
						Select a Course
					</h2>
					<p className="text-sm text-muted-foreground mb-6 max-w-md sm:text-base">
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
						onWeekSelect={(week) => setQueryState({ week })}
						selectedWeek={selectedWeek}
					/>

					<Card>
						<CardHeader>
							<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
								<h2 className="text-lg font-semibold tracking-tight sm:text-xl">
									{materialTitle}
								</h2>
								<p className="text-sm text-muted-foreground">
									WEEK {selectedWeek}
								</p>
							</div>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<NotesSkeletonLoader />
							) : error ? (
								<div className="text-center py-8">
									<AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
									<h3 className="text-lg font-semibold mb-2">
										Unable to load notes
									</h3>
									<p className="text-muted-foreground mb-4">
										Something went wrong while loading your notes.
									</p>
									<Button variant="outline" onClick={() => refetch()}>
										Try Again
									</Button>
								</div>
							) : (
								<Tabs
									value={activeTab}
									onValueChange={(tab) => setQueryState({ tab })}
									className="w-full"
								>
									<TabsList className="grid w-full grid-cols-3">
										<TabsTrigger
											value="golden-notes"
											className="text-xs sm:text-sm"
										>
											Golden Notes ({goldenNotes.length})
										</TabsTrigger>
										<TabsTrigger
											value="summaries"
											className="text-xs sm:text-sm"
										>
											Summaries ({summaries.length})
										</TabsTrigger>
										<TabsTrigger
											value="own-notes"
											className="text-xs sm:text-sm"
										>
											Own Notes
										</TabsTrigger>
									</TabsList>

									<TabsContent value="golden-notes" className="pt-6">
										{goldenNotes.length > 0 ? (
											<div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
												{goldenNotes.map((note: GoldenNote) => (
													<NoteCard
														key={note.id}
														noteId={note.id}
														title={note.title}
														content={note.content}
														withActions={true}
													/>
												))}
											</div>
										) : (
											<div className="flex h-40 items-center justify-center rounded-md border border-dashed">
												<p className="text-sm text-muted-foreground sm:text-base">
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
															<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
																<h3 className="text-lg font-semibold">
																	{summary.title || "Summary"}
																</h3>
																<div className="text-sm text-muted-foreground">
																	{summary.summaryType && (
																		<span className="capitalize">
																			{summary.summaryType}
																		</span>
																	)}
																	{summary.wordCount && (
																		<span className="ml-2">
																			({summary.wordCount} words)
																		</span>
																	)}
																</div>
															</div>
														</CardHeader>
														<CardContent>
															<MDXRenderer content={summary.content} />
														</CardContent>
													</Card>
												))}
											</div>
										) : (
											<div className="flex h-40 items-center justify-center rounded-md border border-dashed">
												<p className="text-sm text-muted-foreground sm:text-base">
													No summaries available for this week yet.
												</p>
											</div>
										)}
									</TabsContent>

									<TabsContent value="own-notes" className="pt-6">
										<FullscreenProvider>
											<UserNotesEditor
												courseId={selectedCourseId}
												weekId={selectedWeekId}
											/>
										</FullscreenProvider>
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
