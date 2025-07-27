import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText, GraduationCap, TrendingUp } from "lucide-react";

interface DashboardStatsProps {
	totalCourses: number;
	totalMaterials?: number;
	completionRate?: number;
	weeklyProgress?: number;
}

export function DashboardStats({
	totalCourses,
	totalMaterials = 0,
	completionRate = 0,
	weeklyProgress = 0,
}: DashboardStatsProps) {
	const stats = [
		{
			title: "Total Courses",
			value: totalCourses,
			icon: BookOpen,
			description: totalCourses === 1 ? "Active course" : "Active courses",
			color: "text-blue-500",
		},
		{
			title: "Study Materials",
			value: totalMaterials,
			icon: FileText,
			description: "Uploaded files",
			color: "text-purple-500",
		},
		{
			title: "Completion Rate",
			value: `${completionRate}%`,
			icon: GraduationCap,
			description: "Overall progress",
			color: "text-green-500",
		},
		{
			title: "This Week",
			value: `+${weeklyProgress}%`,
			icon: TrendingUp,
			description: "Weekly progress",
			color: "text-orange-500",
		},
	];

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
			{stats.map((stat) => {
				const Icon = stat.icon;
				return (
					<Card key={stat.title} className="hover:shadow-md transition-shadow">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-xs sm:text-sm font-medium">
								{stat.title}
							</CardTitle>
							<Icon className={`h-4 w-4 ${stat.color}`} />
						</CardHeader>
						<CardContent>
							<div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
							<p className="text-xs text-muted-foreground mt-1">
								{stat.description}
							</p>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
