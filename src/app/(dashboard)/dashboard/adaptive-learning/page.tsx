"use client";

import { ArrowRight, BookOpen, CheckCircle, Clipboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { QuestionMarkIcon } from "@radix-ui/react-icons";

// Mock data for the activity chart
const activityData = [
	{ month: "May", value: 0 },
	{ month: "Jun", value: 0 },
	{ month: "Jul", value: 0 },
	{ month: "Aug", value: 0 },
	{ month: "Sep", value: 0 },
];

const chartConfig = {
	value: {
		label: "Activity",
		color: "hsl(var(--chart-1))",
	},
};

// Feature cards data
const features = [
	{
		id: "multiple-choice",
		title: "Multiple Choice",
		description: "Test your knowledge with quizzes",
		icon: CheckCircle,
		iconColor: "text-blue-600 dark:text-blue-400",
	},
	{
		id: "cuecards",
		title: "Cue Cards",
		description: "Master key concepts",
		icon: Clipboard,
		iconColor: "text-purple-600 dark:text-purple-400",
	},
	{
		id: "open-questions",
		title: "Open Questions",
		description: "Practice written-response questions",
		icon: QuestionMarkIcon,
		iconColor: "text-teal-600 dark:text-teal-400",
	},
	{
		id: "gap-assessment",
		title: "Gap Assessment",
		description: "Identify and bridge your learning gaps",
		icon: BookOpen,
		iconColor: "text-indigo-600 dark:text-indigo-400",
	},
];

export default function AdaptiveLearningPage() {
	const router = useRouter();

	const handleStartSession = (featureId: string) => {
		router.push(`/dashboard/adaptive-learning/${featureId}`);
	};

	return (
		<div className="space-y-6 sm:space-y-8">
			{/* Feature Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
				{features.map((feature) => {
					const Icon = feature.icon;
					return (
						<Card
							key={feature.id}
							className="hover:shadow-md transition-shadow h-full flex flex-col"
						>
							<CardHeader className="pb-2">
								<div className="flex items-center space-x-2">
									<div
										className={`p-2 rounded-lg bg-background/50 border border-border/50 ${feature.iconColor}`}
									>
										<Icon className="h-5 w-5" />
									</div>
								</div>
							</CardHeader>
							<CardContent className="pt-0 flex flex-col flex-1 justify-between">
								<div className="flex-1">
									<CardTitle className="text-base font-semibold mb-2">{feature.title}</CardTitle>
									<CardDescription className="text-sm text-muted-foreground mb-4">
										{feature.description}
									</CardDescription>
								</div>
								<Button
									className="w-full"
									variant="outline"
									size="sm"
									onClick={() => handleStartSession(feature.id)}
								>
									<span className="flex items-center gap-2 text-xs">
										START SESSION
										<ArrowRight className="h-3 w-3" />
									</span>
								</Button>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Activity Chart */}
			<Card>
				<CardHeader className="pb-4 sm:pb-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<CardTitle className="text-lg sm:text-xl font-semibold">Activity</CardTitle>
						<Select defaultValue="May">
							<SelectTrigger className="w-full sm:w-[120px]">
								<SelectValue placeholder="Month" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="May">May</SelectItem>
								<SelectItem value="Jun">Jun</SelectItem>
								<SelectItem value="Jul">Jul</SelectItem>
								<SelectItem value="Aug">Aug</SelectItem>
								<SelectItem value="Sep">Sep</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					<ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] lg:h-[350px]">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={activityData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
								<XAxis
									dataKey="month"
									tickLine={false}
									axisLine={false}
									className="text-xs sm:text-sm text-muted-foreground"
								/>
								<YAxis
									domain={[0, 10]}
									tickLine={false}
									axisLine={false}
									className="text-xs sm:text-sm text-muted-foreground"
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Line
									type="monotone"
									dataKey="value"
									stroke="var(--color-value)"
									strokeWidth={2}
									dot={{ fill: "var(--color-value)", strokeWidth: 2, r: 3 }}
									activeDot={{ r: 5, fill: "var(--color-value)" }}
								/>
							</LineChart>
						</ResponsiveContainer>
					</ChartContainer>
				</CardContent>
			</Card>
		</div>
	);
}
