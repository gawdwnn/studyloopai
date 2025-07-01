"use client";

import { Brain, Minus, Plus, Target, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GenerationConfig } from "./course-material-upload-wizard";

interface GenerationSettingsProps {
	config: GenerationConfig;
	onConfigChange: (config: GenerationConfig) => void;
}

const DIFFICULTY_OPTIONS = [
	{
		value: "beginner",
		label: "Beginner",
		description: "Basic concepts and simple explanations",
	},
	{
		value: "intermediate",
		label: "Intermediate",
		description: "Moderate complexity with detailed analysis",
	},
	{
		value: "advanced",
		label: "Advanced",
		description: "Complex topics with in-depth exploration",
	},
] as const;

const FOCUS_OPTIONS = [
	{
		value: "conceptual",
		label: "Conceptual",
		description: "Theory and fundamental understanding",
		icon: Brain,
	},
	{
		value: "practical",
		label: "Practical",
		description: "Hands-on applications and examples",
		icon: Target,
	},
	{
		value: "mixed",
		label: "Mixed",
		description: "Balanced theory and practice",
		icon: Zap,
	},
] as const;

export function GenerationSettings({ config, onConfigChange }: GenerationSettingsProps) {
	const updateConfig = (updates: Partial<GenerationConfig>) => {
		onConfigChange({ ...config, ...updates });
	};

	const CounterControl = ({
		label,
		value,
		onChange,
		min = 1,
		max = 50,
		description,
	}: {
		label: string;
		value: number;
		onChange: (value: number) => void;
		min?: number;
		max?: number;
		description?: string;
	}) => (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<Label className="text-sm font-medium">{label}</Label>
					{description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
				</div>
				<Badge variant="secondary" className="text-sm">
					{value}
				</Badge>
			</div>
			<div className="flex items-center space-x-3">
				<Button
					variant="outline"
					size="sm"
					onClick={() => onChange(Math.max(min, value - 1))}
					disabled={value <= min}
					className="h-8 w-8 p-0"
				>
					<Minus className="h-3 w-3" />
				</Button>
				<div className="flex-1">
					<Slider
						value={[value]}
						onValueChange={([newValue]) => onChange(newValue)}
						min={min}
						max={max}
						step={1}
						className="w-full"
					/>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onChange(Math.min(max, value + 1))}
					disabled={value >= max}
					className="h-8 w-8 p-0"
				>
					<Plus className="h-3 w-3" />
				</Button>
			</div>
		</div>
	);

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold mb-2">Content Generation Settings</h3>
				<p className="text-sm text-muted-foreground">
					Configure how AI will generate your study materials
				</p>
			</div>

			<Tabs defaultValue="content" className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="content">Content Types</TabsTrigger>
					<TabsTrigger value="difficulty">Difficulty & Focus</TabsTrigger>
					<TabsTrigger value="summary">Summary Settings</TabsTrigger>
				</TabsList>

				<TabsContent value="content" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Study Materials</CardTitle>
								<CardDescription>Core learning content generation</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<CounterControl
									label="Golden Notes"
									value={config.goldenNotesCount}
									onChange={(value) => updateConfig({ goldenNotesCount: value })}
									min={1}
									max={20}
									description="Key concepts and important points"
								/>
								<CounterControl
									label="Flashcards"
									value={config.flashcardsCount}
									onChange={(value) => updateConfig({ flashcardsCount: value })}
									min={5}
									max={100}
									description="Question-answer pairs for memorization"
								/>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Practice Exercises</CardTitle>
								<CardDescription>Assessment and practice materials</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<CounterControl
									label="Exam Exercises"
									value={config.examExercisesCount}
									onChange={(value) => updateConfig({ examExercisesCount: value })}
									min={1}
									max={25}
									description="Open-ended practice questions"
								/>
								<CounterControl
									label="Multiple Choice Questions"
									value={config.mcqExercisesCount}
									onChange={(value) => updateConfig({ mcqExercisesCount: value })}
									min={5}
									max={50}
									description="MCQ for quick assessment"
								/>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="difficulty" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Difficulty Selection */}
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Difficulty Level</CardTitle>
								<CardDescription>Choose the complexity of generated content</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{DIFFICULTY_OPTIONS.map((option) => (
										<button
											key={option.value}
											type="button"
											className={`w-full p-3 rounded-lg border cursor-pointer transition-colors text-left ${
												config.difficulty === option.value
													? "border-primary bg-primary/5"
													: "border-border hover:border-primary/50"
											}`}
											onClick={() => updateConfig({ difficulty: option.value })}
										>
											<div className="flex items-center justify-between">
												<div>
													<p className="font-medium text-sm">{option.label}</p>
													<p className="text-xs text-muted-foreground mt-1">{option.description}</p>
												</div>
												{config.difficulty === option.value && (
													<div className="w-2 h-2 rounded-full bg-primary" />
												)}
											</div>
										</button>
									))}
								</div>
							</CardContent>
						</Card>

						{/* Focus Selection */}
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Learning Focus</CardTitle>
								<CardDescription>Emphasis for content generation</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{FOCUS_OPTIONS.map((option) => {
										const Icon = option.icon;
										return (
											<button
												key={option.value}
												type="button"
												className={`w-full p-3 rounded-lg border cursor-pointer transition-colors text-left ${
													config.focus === option.value
														? "border-primary bg-primary/5"
														: "border-border hover:border-primary/50"
												}`}
												onClick={() => updateConfig({ focus: option.value })}
											>
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
														<Icon className="h-4 w-4 text-muted-foreground" />
														<div>
															<p className="font-medium text-sm">{option.label}</p>
															<p className="text-xs text-muted-foreground mt-1">
																{option.description}
															</p>
														</div>
													</div>
													{config.focus === option.value && (
														<div className="w-2 h-2 rounded-full bg-primary" />
													)}
												</div>
											</button>
										);
									})}
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="summary" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Summary Configuration</CardTitle>
							<CardDescription>
								Customize the length and style of generated summaries
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<Label className="text-sm font-medium">Summary Length</Label>
									<Badge variant="secondary" className="text-sm">
										{config.summaryLength} words
									</Badge>
								</div>
								<Slider
									value={[config.summaryLength]}
									onValueChange={([value]) => updateConfig({ summaryLength: value })}
									min={100}
									max={1000}
									step={50}
									className="w-full"
								/>
								<div className="flex justify-between text-xs text-muted-foreground">
									<span>Brief (100 words)</span>
									<span>Detailed (1000 words)</span>
								</div>
							</div>

							<div className="p-4 bg-muted/50 rounded-lg">
								<h4 className="text-sm font-medium mb-2">Summary Preview</h4>
								<p className="text-xs text-muted-foreground">
									{config.summaryLength < 200 &&
										"Brief overview covering main points and key takeaways."}
									{config.summaryLength >= 200 &&
										config.summaryLength < 500 &&
										"Comprehensive summary with detailed explanations and examples."}
									{config.summaryLength >= 500 &&
										"In-depth analysis with extensive coverage of all topics and subtopics."}
								</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Quick Stats */}
			<Card className="bg-muted/30">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Generation Summary</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
						<div>
							<p className="text-2xl font-bold text-primary">{config.goldenNotesCount}</p>
							<p className="text-xs text-muted-foreground">Golden Notes</p>
						</div>
						<div>
							<p className="text-2xl font-bold text-primary">{config.flashcardsCount}</p>
							<p className="text-xs text-muted-foreground">Flashcards</p>
						</div>
						<div>
							<p className="text-2xl font-bold text-primary">
								{config.examExercisesCount + config.mcqExercisesCount}
							</p>
							<p className="text-xs text-muted-foreground">Total Exercises</p>
						</div>
						<div>
							<p className="text-2xl font-bold text-primary">{config.summaryLength}</p>
							<p className="text-xs text-muted-foreground">Summary Words</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
