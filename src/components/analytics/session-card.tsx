"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { SessionSummary } from "@/lib/actions/session-analytics";
import { cn } from "@/lib/utils";
import { differenceInDays, format, isToday, isYesterday } from "date-fns";
import {
	BookOpen,
	CheckSquare,
	Clock,
	Eye,
	FileText,
	Target,
	TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SessionCardProps {
	session: SessionSummary;
	className?: string;
}

// Content-type specific configuration
const CONTENT_TYPE_CONFIG = {
	cuecard: {
		label: "Cuecard Session",
		icon: BookOpen,
		color: "text-blue-600",
		bgColor: "bg-blue-50",
		borderColor: "border-blue-200",
	},
	mcq: {
		label: "Multiple Choice",
		icon: CheckSquare,
		color: "text-emerald-600",
		bgColor: "bg-emerald-50",
		borderColor: "border-emerald-200",
	},
	open_question: {
		label: "Open Questions",
		icon: FileText,
		color: "text-violet-600",
		bgColor: "bg-violet-50",
		borderColor: "border-violet-200",
	},
} as const;

export function SessionCard({ session, className }: SessionCardProps) {
	const router = useRouter();
	const config = CONTENT_TYPE_CONFIG[session.contentType];

	// Format time display
	const formatTime = (milliseconds: number) => {
		const seconds = Math.floor(milliseconds / 1000);
		const minutes = Math.floor(seconds / 60);
		return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
	};

	// Format date display
	const formatDate = (date: Date) => {
		const now = new Date();

		if (isToday(date)) {
			return `Today at ${format(date, "HH:mm")}`;
		}
		if (isYesterday(date)) {
			return `Yesterday at ${format(date, "HH:mm")}`;
		}
		if (differenceInDays(now, date) < 7) {
			return `${differenceInDays(now, date)} days ago`;
		}
		return format(date, "MMM d, HH:mm");
	};

	// Get accuracy level styling
	const getAccuracyLevel = (accuracy: number) => {
		if (accuracy >= 90)
			return {
				level: "Excellent",
				color: "text-green-600",
				bgColor: "bg-green-100",
			};
		if (accuracy >= 75)
			return { level: "Good", color: "text-blue-600", bgColor: "bg-blue-100" };
		if (accuracy >= 60)
			return {
				level: "Fair",
				color: "text-yellow-600",
				bgColor: "bg-yellow-100",
			};
		return {
			level: "Needs Work",
			color: "text-red-600",
			bgColor: "bg-red-100",
		};
	};

	const accuracyLevel = getAccuracyLevel(session.accuracy);

	const handleViewDetails = () => {
		router.push(`/dashboard/feedback?sessionId=${session.id}`);
	};

	return (
		<Card
			className={cn(
				"transition-all duration-200 hover:shadow-md cursor-pointer border-l-4",
				config.borderColor,
				className
			)}
			onClick={handleViewDetails}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className={cn("p-2 rounded-lg", config.bgColor)}>
							<config.icon className={cn("w-5 h-5", config.color)} />
						</div>
						<div>
							<CardTitle className="text-lg font-semibold">
								{config.label}
							</CardTitle>
							<CardDescription className="text-sm text-muted-foreground">
								{formatDate(session.startedAt)}
							</CardDescription>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{!session.isCompleted && (
							<Badge
								variant="outline"
								className="text-orange-600 border-orange-200"
							>
								In Progress
							</Badge>
						)}
						<Badge
							className={cn(
								"px-2 py-1 text-xs font-medium",
								accuracyLevel.bgColor,
								accuracyLevel.color
							)}
							variant="secondary"
						>
							{accuracyLevel.level}
						</Badge>
					</div>
				</div>
			</CardHeader>

			<CardContent className="pt-0">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
					{/* Accuracy */}
					<div className="flex items-center gap-2">
						<Target className="w-4 h-4 text-muted-foreground" />
						<div>
							<div className="text-lg font-semibold">
								{Math.round(session.accuracy)}%
							</div>
							<div className="text-xs text-muted-foreground">Accuracy</div>
						</div>
					</div>

					{/* Items Completed */}
					<div className="flex items-center gap-2">
						<TrendingUp className="w-4 h-4 text-muted-foreground" />
						<div>
							<div className="text-lg font-semibold">
								{session.itemsCompleted}
							</div>
							<div className="text-xs text-muted-foreground">Items</div>
						</div>
					</div>

					{/* Total Time */}
					<div className="flex items-center gap-2">
						<Clock className="w-4 h-4 text-muted-foreground" />
						<div>
							<div className="text-lg font-semibold">
								{formatTime(session.totalTime)}
							</div>
							<div className="text-xs text-muted-foreground">Duration</div>
						</div>
					</div>

					{/* Status */}
					<div className="flex items-center gap-2">
						<div
							className={cn(
								"w-2 h-2 rounded-full",
								session.isCompleted ? "bg-green-500" : "bg-orange-500"
							)}
						/>
						<div>
							<div className="text-sm font-medium">
								{session.isCompleted ? "Complete" : "Incomplete"}
							</div>
							<div className="text-xs text-muted-foreground">Status</div>
						</div>
					</div>
				</div>

				{/* View Details Button */}
				<div className="flex justify-end pt-2 border-t">
					<Button
						variant="ghost"
						size="sm"
						className="gap-2 text-muted-foreground hover:text-foreground"
						onClick={(e) => {
							e.stopPropagation();
							handleViewDetails();
						}}
					>
						<Eye className="w-4 h-4" />
						View Details
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
