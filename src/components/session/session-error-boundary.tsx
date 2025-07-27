"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface SessionErrorBoundaryProps {
	children: ReactNode;
}

interface SessionErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

class SessionErrorBoundary extends Component<
	SessionErrorBoundaryProps,
	SessionErrorBoundaryState
> {
	constructor(props: SessionErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): SessionErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("Uncaught error in session component:", error, errorInfo);
		// In a real app, you would log this to an error reporting service
		// e.g., Sentry, LogRocket, etc.
	}

	handleRetry = () => {
		// This is a simple way to retry, by reloading the page.
		// A more sophisticated implementation might involve resetting component state
		// via a callback prop.
		window.location.reload();
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex h-full min-h-[50vh] w-full items-center justify-center bg-background">
					<Card className="w-full max-w-md text-center">
						<CardHeader>
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
								<AlertTriangle className="h-6 w-6 text-destructive" />
							</div>
							<CardTitle className="mt-4">
								Oops! Something went wrong.
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="mb-4 text-muted-foreground">
								An unexpected error occurred in your learning session. Please
								try again.
							</p>
							{process.env.NODE_ENV === "development" && this.state.error && (
								<div className="my-4 rounded-md bg-destructive/10 p-4 text-left text-sm text-destructive">
									<p>
										<strong>Error:</strong> {this.state.error.message}
									</p>
									<pre className="mt-2 whitespace-pre-wrap break-all">
										{this.state.error.stack}
									</pre>
								</div>
							)}
							<Button onClick={this.handleRetry}>Retry Session</Button>
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}

export default SessionErrorBoundary;
