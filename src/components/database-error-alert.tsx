import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

interface DatabaseErrorAlertProps {
	error?: Error;
	onRetry?: () => void;
	className?: string;
}

export function DatabaseErrorAlert({ error, onRetry, className }: DatabaseErrorAlertProps) {
	const isConnectionError =
		error?.message?.includes("ENOTFOUND") ||
		error?.message?.includes("ECONNREFUSED") ||
		error?.message?.includes("getaddrinfo");

	return (
		<Alert className={className} variant="destructive">
			<div className="flex items-center gap-2">
				{isConnectionError ? (
					<WifiOff className="h-4 w-4" />
				) : (
					<AlertTriangle className="h-4 w-4" />
				)}
				<AlertTitle>{isConnectionError ? "Connection Error" : "Database Error"}</AlertTitle>
			</div>
			<AlertDescription className="mt-2">
				{isConnectionError
					? "Unable to connect to the database. Please check your internet connection and try again."
					: "We're experiencing technical difficulties. Please try again in a moment."}
			</AlertDescription>
			{onRetry && (
				<div className="mt-4">
					<Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
						<RefreshCw className="h-4 w-4" />
						Try Again
					</Button>
				</div>
			)}
		</Alert>
	);
}

export function DatabaseConnectionStatus({ isConnected }: { isConnected: boolean }) {
	if (isConnected) return null;

	return (
		<Alert variant="destructive" className="mb-4">
			<WifiOff className="h-4 w-4" />
			<AlertTitle>Database Connection Lost</AlertTitle>
			<AlertDescription>
				Connection to the database has been lost. Some features may not work properly.
			</AlertDescription>
		</Alert>
	);
}
