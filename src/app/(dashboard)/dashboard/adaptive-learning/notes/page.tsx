"use client";

import { useEffect, useState } from "react";

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
import { useNotesData, useUserCourses } from "@/hooks/use-notes";
import { handleApiError, shouldShowRetry } from "@/lib/utils/error-handling";
import { AlertCircle } from "lucide-react";

export default function NotesPage() {
	const [selectedCourseId, setSelectedCourseId] = useState<string>("");
	const [selectedWeek, setSelectedWeek] = useState<number>(1);
	const [selectedWeekId, setSelectedWeekId] = useState<string>("");
	const [activeTab, setActiveTab] = useState("golden-notes");

	const { data, isLoading, error, refetch } = useNotesData(selectedCourseId, selectedWeekId);
	const { data: courses = [] } = useUserCourses();

	const goldenNotes = data?.goldenNotes || [];
	const summaries = data?.summaries || [];
	const weeks = data?.weeks || [];

	useEffect(() => {
		const week = weeks.find((w) => w.weekNumber === selectedWeek);
		if (week) {
			setSelectedWeekId(week.id);
		}
	}, [selectedWeek, weeks]);

	const selectedWeekData = weeks.find((w) => w.weekNumber === selectedWeek);
	const materialTitle = selectedWeekData?.materialTitle || "No materials uploaded";
	const selectedCourse = courses.find((course) => course.id === selectedCourseId);

	return (
		<div className="space-y-6">
			{/* Toolbar with course selector and actions */}
			<div className="flex items-center justify-between">
				<CourseSelectorButton
					onCourseSelect={setSelectedCourseId}
					selectedCourseId={selectedCourseId}
				/>

				{selectedCourseId && (
					<NotesToolbar
						activeTab={activeTab}
						onTabChange={setActiveTab}
						goldenNotes={goldenNotes}
						summaries={summaries}
						courseName={selectedCourse?.name}
						weekNumber={selectedWeek}
						materialTitle={materialTitle}
					/>
				)}
			</div>

			{/* Only show content if a course is selected */}
			{selectedCourseId && (
				<>
					<WeekCarousel
						weeks={weeks.map((w) => ({
							weekNumber: w.weekNumber,
							title: w.materialTitle,
						}))}
						onWeekSelect={setSelectedWeek}
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
							) : error ? (
								<div className="text-center py-8">
									<AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
									<h3 className="text-lg font-semibold mb-2">Unable to load notes</h3>
									<p className="text-muted-foreground mb-4">
										{handleApiError(error, "load notes")}
									</p>
									{shouldShowRetry(error) && (
										<Button variant="outline" onClick={() => refetch()}>
											Try Again
										</Button>
									)}
								</div>
							) : (
								<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
												{goldenNotes.map((note) => (
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
												{summaries.map((summary) => (
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
