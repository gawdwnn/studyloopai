"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TableScrollControlsProps {
	canScrollLeft: boolean;
	canScrollRight: boolean;
	onScrollLeft: () => void;
	onScrollRight: () => void;
	className?: string;
}

export function TableScrollControls({
	canScrollLeft,
	canScrollRight,
	onScrollLeft,
	onScrollRight,
	className,
}: TableScrollControlsProps) {
	if (!canScrollLeft && !canScrollRight) {
		return null;
	}

	return (
		<div className={cn("flex items-center gap-1", className)}>
			<Button
				variant="outline"
				size="sm"
				onClick={onScrollLeft}
				disabled={!canScrollLeft}
				className="h-8 w-8 p-0"
				aria-label="Scroll table left"
			>
				<ChevronLeft className="h-4 w-4" />
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={onScrollRight}
				disabled={!canScrollRight}
				className="h-8 w-8 p-0"
				aria-label="Scroll table right"
			>
				<ChevronRight className="h-4 w-4" />
			</Button>
		</div>
	);
}
