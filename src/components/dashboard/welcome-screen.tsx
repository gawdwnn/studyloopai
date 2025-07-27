import { CreateCourseWrapper } from "@/components/course/create-course-wrapper";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	BookOpen,
	Brain,
	FileText,
	Lightbulb,
	Target,
	TrendingUp,
} from "lucide-react";

const features = [
	{
		icon: FileText,
		title: "Upload Materials",
		description:
			"Upload PDFs, videos, and other study materials for AI processing",
		color: "text-blue-500",
	},
	{
		icon: Brain,
		title: "AI-Generated Content",
		description: "Get smart summaries, flashcards, and practice questions",
		color: "text-purple-500",
	},
	{
		icon: Target,
		title: "Adaptive Learning",
		description: "Personalized study paths that adapt to your progress",
		color: "text-green-500",
	},
	{
		icon: TrendingUp,
		title: "Track Progress",
		description: "Monitor your learning journey with detailed analytics",
		color: "text-orange-500",
	},
];

export function WelcomeScreen() {
	return (
		<div className="space-y-8">
			{/* Hero Section */}
			<div className="text-center space-y-4 py-8">
				<div className="flex justify-center mb-6">
					<div className="rounded-full bg-primary/10 p-6">
						<BookOpen className="h-16 w-16 text-primary sm:h-20 sm:w-20" />
					</div>
				</div>
				<h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
					Welcome to StudyLoop AI
				</h1>
				<p className="text-base text-muted-foreground max-w-2xl mx-auto sm:text-lg">
					Transform your learning experience with AI-powered study tools that
					adapt to your needs
				</p>
				<div className="pt-4">
					<CreateCourseWrapper />
				</div>
			</div>

			{/* Features Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{features.map((feature) => {
					const Icon = feature.icon;
					return (
						<Card
							key={feature.title}
							className="border-muted hover:shadow-md transition-shadow"
						>
							<CardHeader className="pb-3">
								<div className={`mb-2 ${feature.color}`}>
									<Icon className="h-8 w-8" />
								</div>
								<CardTitle className="text-base sm:text-lg">
									{feature.title}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-sm">
									{feature.description}
								</CardDescription>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Getting Started Steps */}
			<Card className="border-primary/20 bg-primary/5">
				<CardHeader>
					<div className="flex items-center gap-3">
						<Lightbulb className="h-5 w-5 text-primary" />
						<CardTitle className="text-lg sm:text-xl">
							Getting Started
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					<ol className="space-y-3 text-sm sm:text-base">
						<li className="flex items-start gap-3">
							<Badge variant="outline" className="mt-0.5">
								1
							</Badge>
							<span>
								Create your first course to organize your study materials
							</span>
						</li>
						<li className="flex items-start gap-3">
							<Badge variant="outline" className="mt-0.5">
								2
							</Badge>
							<span>Upload course materials like PDFs, videos, or links</span>
						</li>
						<li className="flex items-start gap-3">
							<Badge variant="outline" className="mt-0.5">
								3
							</Badge>
							<span>
								Let AI generate summaries, flashcards, and practice questions
							</span>
						</li>
						<li className="flex items-start gap-3">
							<Badge variant="outline" className="mt-0.5">
								4
							</Badge>
							<span>
								Study with adaptive learning tools and track your progress
							</span>
						</li>
					</ol>
				</CardContent>
			</Card>
		</div>
	);
}
