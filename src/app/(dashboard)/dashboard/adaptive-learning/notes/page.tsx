"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CourseSelectorButton } from "@/components/notes/course-selector-button";
import { NoteCard } from "@/components/notes/note-card";
import { WeekCarousel } from "@/components/notes/week-carousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	type UpdateGoldenNoteInput,
	deleteGoldenNote,
	getNotesData,
	updateGoldenNote,
} from "@/lib/actions/notes";
import { Cloud, List, Menu } from "lucide-react";

type ExportType = "pdf" | "csv" | "json";

interface GoldenNote {
	id: string;
	title: string;
	content: string;
	priority: number | null;
	category: string | null;
	createdAt: Date;
	updatedAt: Date;
	weekId: string;
	courseId: string;
}

interface Summary {
	id: string;
	title: string | null;
	content: string;
	summaryType: string | null;
	wordCount: number | null;
	createdAt: Date;
	updatedAt: Date;
	weekId: string;
	courseId: string;
}

interface Week {
	id: string;
	weekNumber: number;
	title: string | null;
	hasContent: boolean;
	materialTitle: string | null;
}

export default function NotesPage() {
	const [selectedCourseId, setSelectedCourseId] = useState<string>("");
	const [selectedWeek, setSelectedWeek] = useState<number>(1);
	const [selectedWeekId, setSelectedWeekId] = useState<string>("");
	const [activeTab, setActiveTab] = useState("golden-notes");

	// Data state
	const [goldenNotes, setGoldenNotes] = useState<GoldenNote[]>([]);
	const [summaries, setSummaries] = useState<Summary[]>([]);
	const [weeks, setWeeks] = useState<Week[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch notes data when course or week changes
	useEffect(() => {
		if (!selectedCourseId) return;

		const fetchNotesData = async () => {
			try {
				setIsLoading(true);
				setError(null);

				const data = await getNotesData(selectedCourseId, selectedWeekId || undefined);
				setGoldenNotes(data.goldenNotes);
				setSummaries(data.summaries);
				setWeeks(data.weeks);
			} catch (err) {
				console.error("Failed to fetch notes data:", err);
				setError("Failed to load notes");
				toast.error("Failed to load notes data");
			} finally {
				setIsLoading(false);
			}
		};

		fetchNotesData();
	}, [selectedCourseId, selectedWeekId]);

	// Update selected week ID when week number changes
	useEffect(() => {
		const week = weeks.find((w) => w.weekNumber === selectedWeek);
		if (week) {
			setSelectedWeekId(week.id);
		}
	}, [selectedWeek, weeks]);

	const handleExport = (type: ExportType) => {
		toast.info(`Exporting notes as ${type.toUpperCase()}...`);
	};

	const handleNoteEdit = async (noteId: string, updatedData: Partial<UpdateGoldenNoteInput>) => {
		try {
			const result = await updateGoldenNote({ id: noteId, ...updatedData });
			if (result.success) {
				toast.success("Note updated successfully!");
				// Refresh data
				const data = await getNotesData(selectedCourseId, selectedWeekId || undefined);
				setGoldenNotes(data.goldenNotes);
			} else {
				toast.error(result.error || "Failed to update note");
			}
		} catch (err) {
			console.error("Failed to update note:", err);
			toast.error("Failed to update note");
		}
	};

	const handleNoteDelete = async (noteId: string) => {
		try {
			const result = await deleteGoldenNote(noteId);
			if (result.success) {
				toast.success("Note deleted successfully!");
				// Remove from state
				setGoldenNotes((prev) => prev.filter((note) => note.id !== noteId));
			} else {
				toast.error(result.error || "Failed to delete note");
			}
		} catch (err) {
			console.error("Failed to delete note:", err);
			toast.error("Failed to delete note");
		}
	};

	const selectedWeekData = weeks.find((w) => w.weekNumber === selectedWeek);
	const materialTitle = selectedWeekData?.materialTitle || "No materials uploaded";

	return (
		<div className="space-y-6">
			{/* Toolbar with course selector and actions */}
			<div className="flex items-center justify-between">
				<CourseSelectorButton
					onCourseSelect={setSelectedCourseId}
					selectedCourseId={selectedCourseId}
				/>

				{selectedCourseId && (
					<div className="flex items-center space-x-2">
						{/* Export and view toggles */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="icon">
									<Cloud className="h-4 w-4" />
									<span className="sr-only">Export notes</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => handleExport("pdf")}>PDF</DropdownMenuItem>
								<DropdownMenuItem onClick={() => handleExport("csv")}>CSV</DropdownMenuItem>
								<DropdownMenuItem onClick={() => handleExport("json")}>JSON</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<Button
							variant={activeTab === "golden-notes" ? "default" : "outline"}
							size="icon"
							onClick={() => setActiveTab("golden-notes")}
						>
							<List className="h-4 w-4" />
							<span className="sr-only">Toggle Golden Notes view</span>
						</Button>

						<Button
							variant={activeTab === "summaries" ? "default" : "outline"}
							size="icon"
							onClick={() => setActiveTab("summaries")}
						>
							<Menu className="h-4 w-4" />
							<span className="sr-only">Toggle Summaries view</span>
						</Button>
					</div>
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
								<div className="space-y-4">
									<Skeleton className="h-8 w-full" />
									<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
										<div className="space-y-2">
											<Skeleton className="h-6 w-3/4" />
											<Skeleton className="h-20 w-full" />
										</div>
										<div className="space-y-2">
											<Skeleton className="h-6 w-3/4" />
											<Skeleton className="h-20 w-full" />
										</div>
										<div className="space-y-2">
											<Skeleton className="h-6 w-3/4" />
											<Skeleton className="h-20 w-full" />
										</div>
										<div className="space-y-2">
											<Skeleton className="h-6 w-3/4" />
											<Skeleton className="h-20 w-full" />
										</div>
									</div>
								</div>
							) : error ? (
								<div className="text-center py-8">
									<p className="text-destructive mb-2">{error}</p>
									<Button variant="outline" onClick={() => window.location.reload()}>
										Try Again
									</Button>
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
														id={note.id}
														title={note.title}
														content={note.content}
														withActions={true}
														onEdit={(id, data) => handleNoteEdit(id, data)}
														onDelete={handleNoteDelete}
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
															<p className="text-muted-foreground whitespace-pre-wrap">
																{summary.content}
															</p>
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

									<TabsContent value="own-notes">
										<div className="flex h-40 items-center justify-center rounded-md border border-dashed">
											<p className="text-muted-foreground">Your own notes will be shown here.</p>
										</div>
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
