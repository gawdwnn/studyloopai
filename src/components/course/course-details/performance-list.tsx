import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight } from "lucide-react";

interface CoursePerformance {
	name: string;
	performance: number;
}

interface PerformanceListProps {
	title: string;
	courses: CoursePerformance[];
}

export function PerformanceList({ title, courses }: PerformanceListProps) {
	return (
		<Card className="flex-1 flex flex-col">
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<Button variant="ghost" size="sm">
					<ArrowUpRight className="h-4 w-4" />
				</Button>
			</CardHeader>
			<CardContent className="flex-1">
				<div className="space-y-4">
					{courses.map((course) => (
						<div key={course.name} className="flex items-center">
							<p className="text-sm text-muted-foreground flex-1">
								{course.name}
							</p>
							<Progress value={course.performance} className="w-24" />
							<span className="text-sm font-medium w-12 text-right">
								{course.performance}%
							</span>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
