"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, Home, RotateCcw } from "lucide-react";

interface ErrorPageProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
	const handleBackToDashboard = () => {
		window.location.href = "/dashboard";
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40 p-4 sm:p-6">
			<div className="flex h-[calc(100vh-200px)] items-center justify-center">
				<div className="text-center max-w-md mx-auto">
					<AlertCircle className="h-16 w-16 mx-auto mb-6 text-destructive" />
					<h2 className="text-2xl font-bold mb-4 text-foreground">
						Unable to Load Session Feedback
					</h2>
					<p className="text-muted-foreground mb-6 text-sm sm:text-base">
						{error.message ||
							"Something went wrong while loading your session analytics. Please try again."}
					</p>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<Button onClick={reset} className="w-full sm:w-auto">
							<RotateCcw className="w-4 h-4 mr-2" />
							Try Again
						</Button>
						<Button
							variant="outline"
							onClick={handleBackToDashboard}
							className="w-full sm:w-auto"
						>
							<Home className="w-4 h-4 mr-2" />
							Back to Dashboard
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
