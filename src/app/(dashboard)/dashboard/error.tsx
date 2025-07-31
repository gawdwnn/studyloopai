"use client";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/utils/logger";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function DashboardError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		logger.error("Dashboard error occurred", {
			message: error.message,
			stack: error.stack,
			digest: error.digest,
			timestamp: new Date().toISOString(),
		});
	}, [error]);

	return (
		<div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center text-center">
			<div className="rounded-full bg-destructive/10 p-6 mb-6">
				<AlertCircle className="h-16 w-16 text-destructive sm:h-20 sm:w-20" />
			</div>
			<h2 className="text-xl font-bold tracking-tight mb-2 sm:text-2xl lg:text-3xl">
				Something went wrong!
			</h2>
			<p className="text-sm text-muted-foreground mb-6 max-w-md sm:text-base">
				We encountered an error loading your dashboard. Please try again.
			</p>
			<div className="flex flex-col sm:flex-row gap-3">
				<Button onClick={reset} variant="default">
					<RefreshCw className="mr-2 h-4 w-4" />
					Try Again
				</Button>
				<Button asChild variant="outline">
					<Link href="/">
						<Home className="mr-2 h-4 w-4" />
						Go Home
					</Link>
				</Button>
			</div>
		</div>
	);
}
