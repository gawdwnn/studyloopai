"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import React from "react";

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ReactNode;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
		this.props.onError?.(error, errorInfo);
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: undefined });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<Card className="w-full max-w-md mx-auto mt-8">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
							<AlertTriangle className="h-6 w-6 text-red-600" />
						</div>
						<CardTitle className="text-red-900">Something went wrong</CardTitle>
						<CardDescription>
							We encountered an unexpected error. This might be due to a connection issue or a
							temporary problem.
						</CardDescription>
					</CardHeader>
					<CardContent className="text-center space-y-4">
						{process.env.NODE_ENV === "development" && this.state.error && (
							<details className="text-sm text-left bg-gray-100 p-4 rounded">
								<summary className="cursor-pointer font-medium">Error Details</summary>
								<pre className="mt-2 text-xs overflow-auto">{this.state.error.stack}</pre>
							</details>
						)}
						<div className="flex gap-2 justify-center">
							<Button onClick={this.handleRetry} variant="outline" size="sm">
								<RefreshCw className="h-4 w-4 mr-2" />
								Try Again
							</Button>
							<Button onClick={() => window.location.reload()} variant="default" size="sm">
								Reload Page
							</Button>
						</div>
					</CardContent>
				</Card>
			);
		}

		return this.props.children;
	}
}

// Hook-based error boundary for simpler usage
export function useErrorHandler() {
	return (error: Error) => {
		console.error("Handled error:", error);
		// You could also dispatch to a global error state here
	};
}
