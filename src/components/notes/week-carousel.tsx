"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface Week {
	weekNumber: number;
	title: string | null;
}

interface WeekCarouselProps {
	weeks: Week[];
	onWeekSelect: (weekNumber: number) => void;
	selectedWeek: number;
}

export function WeekCarousel({ weeks, onWeekSelect, selectedWeek }: WeekCarouselProps) {
	const handleWeekClick = (weekNumber: number) => {
		onWeekSelect(weekNumber);
	};

	return (
		<Carousel
			opts={{
				align: "start",
			}}
			className="w-full"
		>
			<CarouselContent>
				{weeks.map((week) => (
					<CarouselItem
						key={week.weekNumber}
						className="basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6"
					>
						<Card
							className={cn(
								"h-full cursor-pointer transition-colors hover:border-primary",
								selectedWeek === week.weekNumber && "border-primary"
							)}
							onClick={() => handleWeekClick(week.weekNumber)}
						>
							<CardHeader>
								<CardTitle className="text-sm font-medium text-muted-foreground">
									WEEK {week.weekNumber}
								</CardTitle>
							</CardHeader>
							<CardContent>
								{week.title ? (
									<p className="line-clamp-2 text-sm font-semibold">{week.title}</p>
								) : (
									<p className="text-xs text-muted-foreground">No files for this week yet...</p>
								)}
							</CardContent>
						</Card>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious className="ms-12" />
			<CarouselNext className="me-12" />
		</Carousel>
	);
}
