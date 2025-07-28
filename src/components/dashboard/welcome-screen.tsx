import { CreateCourseWrapper } from "@/components/course/create-course-wrapper";
import { RocketIcon } from "lucide-react";

export function WelcomeScreen() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
			{/* Action-focused hero */}
			<div className="space-y-4">
				<div className="flex justify-center mb-4">
					<div className="rounded-full bg-primary/10 p-4">
						<RocketIcon className="h-12 w-12 text-primary" />
					</div>
				</div>
				<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
					Ready to ace your next exam?
				</h1>
				<p className="text-lg text-muted-foreground max-w-lg mx-auto">
					Create your first course and let AI transform your study materials
					into personalized learning tools.
				</p>
			</div>

			{/* Primary CTA */}
			<div className="pt-4">
				<CreateCourseWrapper />
			</div>

			{/* Subtle value prop */}
			<p className="text-sm text-muted-foreground">
				Get summaries, cuecards and practice questions in under 2 minutes
			</p>
		</div>
	);
}
