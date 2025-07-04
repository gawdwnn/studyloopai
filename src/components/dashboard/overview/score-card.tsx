import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export function ScoreCard() {
	return (
		<Card className="h-full">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">Score</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-xs text-muted-foreground">Course</p>
						<p className="text-lg font-bold">7</p>
					</div>
					<div>
						<div className="flex items-center gap-1">
							<p className="text-xs text-muted-foreground">Exercise</p>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<Info size={12} />
									</TooltipTrigger>
									<TooltipContent>
										<p>Total exercises completed.</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<p className="text-lg font-bold">20</p>
					</div>
					<div>
						<div className="flex items-center gap-1">
							<p className="text-xs text-muted-foreground">Grade</p>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<Info size={12} />
									</TooltipTrigger>
									<TooltipContent>
										<p>Your current GPA.</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<p className="text-lg font-bold">
							4.5<span className="text-sm text-muted-foreground">GPA</span>
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
