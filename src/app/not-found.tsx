import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="text-center space-y-6 max-w-md">
				<h1 className="text-8xl font-bold text-muted-foreground">404</h1>
				<div className="space-y-2">
					<h2 className="text-2xl font-semibold">Page Not Found</h2>
					<p className="text-muted-foreground">
						Sorry, we couldn't find the page you're looking for.
					</p>
				</div>
				<div className="flex flex-col sm:flex-row gap-3 justify-center">
					<Button asChild variant="default">
						<Link href="/">Go Home</Link>
					</Button>
					<Button asChild variant="outline">
						<Link href="/dashboard">Go to Dashboard</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
