"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { X } from "lucide-react";

interface CuecardKeywordViewProps {
	keyword: string;
	onShowAnswer: () => void;
	onClose: () => void;
	currentIndex: number;
	totalCards: number;
	weekInfo: string;
}

export function CuecardKeywordView({
	keyword,
	onShowAnswer,
	onClose,
	currentIndex,
	totalCards,
	weekInfo,
}: CuecardKeywordViewProps) {
	return (
		<div className="min-h-screen bg-background flex items-center justify-center">
			<Card className="w-full max-w-4xl relative">
				<Button
					variant="ghost"
					size="icon"
					className="absolute top-4 right-4 z-10 bg-muted hover:bg-muted/80 rounded-full"
					onClick={onClose}
				>
					<X className="h-6 w-6 text-muted-foreground" />
				</Button>

				<CardHeader className="text-center pb-2">
					<div className="flex justify-between items-center mb-4">
						<div className="text-sm text-muted-foreground">{weekInfo}</div>
						<div className="text-sm text-muted-foreground">
							{currentIndex + 1} / {totalCards}
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-8">
					<div className="text-center">
						<h2 className="text-2xl font-semibold mb-8">Keyword</h2>

						<div className="min-h-[200px] flex items-center justify-center">
							<p className="text-lg font-medium">{keyword}</p>
						</div>
					</div>

					<div className="flex justify-center">
						<Button
							onClick={onShowAnswer}
							variant="secondary"
							className="px-8 py-3 text-base font-medium"
						>
							Show answer
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
