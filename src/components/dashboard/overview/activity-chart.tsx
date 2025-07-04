"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const data = [
	{
		name: "May",
		total: 8,
	},
	{
		name: "June",
		total: 5,
	},
	{
		name: "July",
		total: 9,
	},
	{
		name: "Aug",
		total: 4,
	},
	{
		name: "Sep",
		total: 6,
	},
];

export function ActivityChart() {
	return (
		<Card className="flex-1 flex flex-col">
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-sm font-medium">Activity</CardTitle>
				<Select defaultValue="may">
					<SelectTrigger className="w-[120px]">
						<SelectValue placeholder="Select month" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="may">May</SelectItem>
						<SelectItem value="june">June</SelectItem>
						<SelectItem value="july">July</SelectItem>
						<SelectItem value="august">August</SelectItem>
						<SelectItem value="september">September</SelectItem>
					</SelectContent>
				</Select>
			</CardHeader>
			<CardContent className="flex-1">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={data}>
						<XAxis
							dataKey="name"
							stroke="#888888"
							fontSize={12}
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							stroke="#888888"
							fontSize={12}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value) => `${value}`}
							domain={[0, 10]}
						/>
						<Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
					</BarChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
