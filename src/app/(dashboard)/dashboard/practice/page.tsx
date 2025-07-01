import { AppTabNav } from "@/components/app-tab-nav";

export default function PracticePage() {
	const tabs = [
		{ label: "Flashcards", href: "/practice/flashcards" },
		{ label: "Quizzes", href: "/practice/quizzes" },
		{ label: "Exam Simulator", href: "/practice/exam" },
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Practice</h1>
				<p className="text-muted-foreground">Test your knowledge with various study tools</p>
			</div>
			<AppTabNav tabs={tabs} />
			<div className="grid gap-4">{/* Content will be added here */}</div>
		</div>
	);
}
