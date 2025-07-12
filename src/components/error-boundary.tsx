"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import React from "react";

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
	retryCount: number;
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ReactNode;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
	showRetry?: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, retryCount: 0 };
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);

		// TODO: Add Sentry error reporting here
		this.props.onError?.(error, errorInfo);
	}

	handleRetry = () => {
		this.setState((prevState) => ({
			hasError: false,
			error: undefined,
			retryCount: prevState.retryCount + 1,
		}));
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<ErrorFallback
					error={this.state.error}
					onRetry={this.props.showRetry === true ? this.handleRetry : undefined}
				/>
			);
		}

		// Use retry count as key to force re-mounting of children on retry
		return <div key={`retry-${this.state.retryCount}`}>{this.props.children}</div>;
	}
}

interface ErrorFallbackProps {
	error?: Error;
	onRetry?: () => void;
}

function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
	return (
		<div className="min-h-[50vh] flex items-center justify-center p-4 mt-30">
			<Card className="w-full max-w-lg">
				<CardHeader className="text-center space-y-4">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
						<AlertTriangle className="h-8 w-8 text-destructive" />
					</div>
					<div className="space-y-2">
						<CardTitle className="text-xl">Something went wrong</CardTitle>
						<CardDescription className="text-base">
							We encountered an unexpected error. This might be due to a connection issue or a
							temporary problem. Please try again or reload the page.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{process.env.NODE_ENV === "development" && error && (
						<details className="text-sm bg-muted p-4 rounded-md border">
							<summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground transition-colors">
								Error Details (Development)
							</summary>
							<pre className="mt-3 text-xs overflow-auto text-muted-foreground font-mono whitespace-pre-wrap">
								{error.stack}
							</pre>
						</details>
					)}
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						{onRetry && (
							<Button
								onClick={onRetry}
								variant="outline"
								size="default"
								className="flex-1 sm:flex-none"
							>
								<RefreshCw className="h-4 w-4 mr-2" />
								Try Again
							</Button>
						)}
						<Button
							onClick={() => window.location.reload()}
							variant="default"
							size="default"
							className="flex-1 sm:flex-none"
						>
							Reload Page
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// Hook-based error boundary for simpler usage
export function useErrorHandler() {
	return (error: Error) => {
		console.error("Handled error:", error);
		// You could also dispatch to a global error state here
	};
}
