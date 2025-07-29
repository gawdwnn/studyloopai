import { ArrowRight, Brain, CheckCircle, Clipboard, Route } from "lucide-react";
import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { QuestionMarkIcon } from "@radix-ui/react-icons";

export const metadata = {
	title: "Adaptive Learning - StudyLoop AI",
	description:
		"Enhance your learning with AI-powered adaptive features including quizzes, cuecards, and personalized assessments.",
};

// Feature cards data
const features = [
	{
		id: "cuecards",
		title: "Smart Cuecards",
		description:
			"Master key concepts with AI-generated cuecards and spaced repetition",
		icon: Clipboard,
		iconColor: "text-purple-600 dark:text-purple-400",
		available: true,
	},
	{
		id: "multiple-choice",
		title: "Multiple Choice Questions",
		description:
			"Test your knowledge with AI-generated MCQs tailored to your course materials",
		icon: CheckCircle,
		iconColor: "text-blue-600 dark:text-blue-400",
		available: false,
		comingSoon: true,
	},
	{
		id: "open-questions",
		title: "Open-Ended Questions",
		description:
			"Practice critical thinking with written-response questions and AI feedback",
		icon: QuestionMarkIcon,
		iconColor: "text-teal-600 dark:text-teal-400",
		available: false,
		comingSoon: true,
	},
	{
		id: "concept-maps",
		title: "Concept Maps",
		description:
			"Visualize connections between topics with interactive concept mapping",
		icon: Route,
		iconColor: "text-orange-600 dark:text-orange-400",
		available: false,
		comingSoon: true,
	},
	{
		id: "gap-assessment",
		title: "Learning Gap Analysis",
		description:
			"Identify knowledge gaps and receive personalized learning recommendations",
		icon: Brain,
		iconColor: "text-green-600 dark:text-green-400",
		available: false,
		comingSoon: true,
	},
];

export default function AdaptiveLearningPage() {
	return (
		<div className="space-y-6">
			<PageHeading
				title="Adaptive Learning"
				description="Enhance your learning with AI-powered tools that adapt to your progress and learning style. Our adaptive learning features use AI to analyze your progress and customize your study experience. Each tool adapts to your learning pace, identifies knowledge gaps, and provides targeted practice to maximize your learning efficiency."
			/>

			{/* Feature Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{features.map((feature) => {
					const Icon = feature.icon;
					return (
						<Card
							key={feature.id}
							className={`hover:shadow-md transition-all duration-200 h-full flex flex-col ${
								feature.available ? "hover:scale-[1.02]" : "opacity-75"
							}`}
						>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<div
										className={`p-2 rounded-lg bg-background/50 border ${feature.iconColor}`}
									>
										<Icon className="h-5 w-5" />
									</div>
									{feature.comingSoon && (
										<span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
											Coming Soon
										</span>
									)}
								</div>
							</CardHeader>
							<CardContent className="pt-0 flex flex-col flex-1">
								<div className="flex-1 space-y-2">
									<CardTitle className="text-base font-semibold">
										{feature.title}
									</CardTitle>
									<CardDescription className="text-xs leading-relaxed line-clamp-3">
										{feature.description}
									</CardDescription>
								</div>
								<div className="mt-4">
									{feature.available ? (
										<Button
											asChild
											className="w-full h-8 text-sm"
											variant="default"
										>
											<Link href={`/dashboard/adaptive-learning/${feature.id}`}>
												<span className="flex items-center gap-1.5">
													Start Session
													<ArrowRight className="h-3 w-3" />
												</span>
											</Link>
										</Button>
									) : (
										<Button
											className="w-full h-8 text-sm"
											variant="outline"
											disabled
										>
											Coming Soon
										</Button>
									)}
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
