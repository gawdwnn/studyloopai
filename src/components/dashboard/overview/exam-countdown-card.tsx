import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function ExamCountdownCard() {
	const countdown = 115;
	const totalDays = 150;
	const progress = ((totalDays - countdown) / totalDays) * 100;

	return (
		<Card className="h-full">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">Exams</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex items-baseline justify-between">
					<div>
						<p className="text-xs text-muted-foreground">Countdown</p>
						<p className="text-lg font-semibold">115 days</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">Date</p>
						<p className="text-lg font-semibold">28th Aug</p>
					</div>
				</div>
				<Progress value={progress} className="mt-4" />
			</CardContent>
		</Card>
	);
}
