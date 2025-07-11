import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { XIcon } from "lucide-react";
import { useState } from "react";

const DUMMY_WEEKS = [
	{ id: "week1", label: "Week 1 (May 5 - May 12) - Part 1" },
	{ id: "week2", label: "Week 2 (May 13 - May 19) - Part 2" },
	{ id: "week3", label: "Week 3 (May 20 - May 27)" },
	{ id: "week4", label: "Week 4 (May 28 - June 2)" },
	{ id: "week5", label: "Week 5 (June 3 - June 9)" },
	{ id: "week6", label: "Week 6 (June 10 - June 16)" },
	{ id: "week7", label: "Week 7 (June 17 - June 23)" },
];

const DUMMY_PDFS = [
	{ id: "pdf1", label: "Practical guide to building agents.pdf" },
	{
		id: "pdf2",
		label: "Using design thinking to solve everyday problem.pdf",
	},
];

interface SessionConfig {
	weeks: string[];
	materials: string[];
	difficulty: string;
	numQuestions: number;
	focus: string;
	practiceMode: "practice" | "exam";
}

type McqSessionSetupProps = {
	onStartSession: (config: SessionConfig) => void;
	onClose?: () => void;
};

export function McqSessionSetup({ onStartSession, onClose }: McqSessionSetupProps) {
	const [selectedWeek, setSelectedWeek] = useState<string>("all-weeks");
	const [selectedPdf, setSelectedPdf] = useState<string>("all-pdfs");
	const [difficulty, setDifficulty] = useState<string>("");
	const [numQuestions, setNumQuestions] = useState<string>("20");
	const [focus, setFocus] = useState<string>("tailored-for-me");
	const [practiceMode, setPracticeMode] = useState<string>("practice");

	const handleStartSession = () => {
		const config: SessionConfig = {
			weeks: selectedWeek === "all-weeks" ? [] : [selectedWeek],
			materials: selectedPdf === "all-pdfs" ? [] : [selectedPdf],
			difficulty: difficulty || "mixed",
			numQuestions: Number.parseInt(numQuestions),
			focus,
			practiceMode: practiceMode as "practice" | "exam",
		};
		onStartSession(config);
	};

	return (
		<div className="flex justify-center mt-10">
			<Card className="w-full max-w-4xl relative">
				<Button
					variant="ghost"
					size="icon"
					className="absolute top-4 right-4 z-10 bg-gray-100 hover:bg-gray-200 rounded-full"
					onClick={onClose}
				>
					<XIcon className="h-6 w-6 text-gray-600" />
				</Button>
				<CardHeader className="text-center pb-8">
					<CardTitle className="text-lg">Start a Multiple Choice Session</CardTitle>
				</CardHeader>
				<CardContent className="px-8 space-y-6">
					{/* Week Selection */}
					<div className="space-y-2">
						<Select value={selectedWeek} onValueChange={setSelectedWeek}>
							<SelectTrigger className="h-12 w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all-weeks">All weeks selected</SelectItem>
								{DUMMY_WEEKS.map((week) => (
									<SelectItem key={week.id} value={week.id}>
										{week.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* PDF Selection */}
					<div className="space-y-2">
						<Select value={selectedPdf} onValueChange={setSelectedPdf}>
							<SelectTrigger className="h-12 w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all-pdfs">All PDFs selected</SelectItem>
								{DUMMY_PDFS.map((pdf) => (
									<SelectItem key={pdf.id} value={pdf.id}>
										{pdf.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Settings Section */}
					<div className="">
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem value="settings" className="border rounded-lg">
								<AccordionTrigger className="px-4 py-3 hover:no-underline">
									<span className="font-medium">Settings</span>
								</AccordionTrigger>
								<AccordionContent className="px-4 pb-4 space-y-4">
									{/* Difficulty Selection */}
									<div className="space-y-2">
										<Select value={difficulty} onValueChange={setDifficulty}>
											<SelectTrigger className="h-12 w-full">
												<SelectValue placeholder="Select difficulty of the questions" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="easy">Easy</SelectItem>
												<SelectItem value="medium">Medium</SelectItem>
												<SelectItem value="hard">Hard</SelectItem>
												<SelectItem value="mixed">Mixed</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{/* Number of Questions */}
									<div className="space-y-2">
										<Select value={numQuestions} onValueChange={setNumQuestions}>
											<SelectTrigger className="h-12 w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="10">10</SelectItem>
												<SelectItem value="15">15</SelectItem>
												<SelectItem value="20">20</SelectItem>
												<SelectItem value="25">25</SelectItem>
												<SelectItem value="30">30</SelectItem>
											</SelectContent>
										</Select>
										<p className="text-xs text-muted-foreground">Select the number of questions</p>
									</div>

									{/* Focus Selection */}
									<div className="space-y-2">
										<Select value={focus} onValueChange={setFocus}>
											<SelectTrigger className="h-12 w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="tailored-for-me">Tailored for me</SelectItem>
												<SelectItem value="weak-areas">Focus on weak areas</SelectItem>
												<SelectItem value="recent-content">Recent content</SelectItem>
												<SelectItem value="comprehensive">Comprehensive review</SelectItem>
											</SelectContent>
										</Select>
										<p className="text-xs text-muted-foreground">Select Focus</p>
										<p className="text-xs text-muted-foreground">
											"Tailored for me" includes unanswered exercises and ones you've struggled
											with.
										</p>
									</div>

									{/* Practice/Exam Mode */}
									<div className="space-y-4">
										<RadioGroup
											value={practiceMode}
											onValueChange={setPracticeMode}
											className="flex gap-8"
										>
											<div className="flex flex-col space-y-1">
												<div className="flex items-center space-x-2">
													<RadioGroupItem value="practice" id="practice" />
													<Label htmlFor="practice" className="font-medium">
														Practice Mode
													</Label>
												</div>
												<p className="text-xs text-muted-foreground ml-6">
													Show answers immediately
												</p>
											</div>
											<div className="flex flex-col space-y-1">
												<div className="flex items-center space-x-2">
													<RadioGroupItem value="exam" id="exam" />
													<Label htmlFor="exam" className="font-medium">
														Exam Mode
													</Label>
												</div>
												<p className="text-xs text-muted-foreground ml-6">
													Show answers after session
												</p>
											</div>
										</RadioGroup>
									</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</div>
				</CardContent>
				<CardFooter className="flex flex-col items-center space-y-4 pt-6">
					<p className="text-sm text-muted-foreground">
						Your session will contain {numQuestions} questions
					</p>
					<Button
						size="lg"
						onClick={handleStartSession}
						className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
					>
						Start
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
