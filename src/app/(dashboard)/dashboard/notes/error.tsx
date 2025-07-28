"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface NotesErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function NotesError({ error, reset }: NotesErrorProps) {
	return (
		<div className="flex h-[calc(100vh-200px)] items-center justify-center">
			<div className="text-center max-w-md">
				<AlertCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
				<h2 className="text-xl font-bold mb-2 sm:text-2xl">
					Unable to Load Notes
				</h2>
				<p className="text-sm text-muted-foreground mb-6 sm:text-base">
					{error.message ||
						"Something went wrong while loading your notes. Please try again."}
				</p>
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button onClick={reset} className="w-full sm:w-auto">
						Try Again
					</Button>
					<Button
						variant="outline"
						onClick={() => {
							window.location.href = "/dashboard";
						}}
						className="w-full sm:w-auto"
					>
						Go to Dashboard
					</Button>
				</div>
			</div>
		</div>
	);
}
