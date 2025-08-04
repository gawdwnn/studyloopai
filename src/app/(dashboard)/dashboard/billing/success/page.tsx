import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { SuccessPageClient } from "./success-client";

async function SuccessContent() {
	// TODO: Could verify checkout completion here using checkout_id from URL params

	return (
		<div className="container max-w-2xl mx-auto py-16">
			<Card className="text-center">
				<CardHeader className="space-y-4 pb-8">
					<div className="mx-auto">
						<div className="relative">
							<CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
							<Sparkles className="h-8 w-8 text-yellow-500 absolute -top-2 -right-2 animate-pulse" />
						</div>
					</div>
					<div className="space-y-2">
						<CardTitle className="text-3xl font-bold">
							Payment Successful!
						</CardTitle>
						<CardDescription className="text-lg">
							Welcome to StudyLoop Pro! Your subscription is now active.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="space-y-6 pb-8">
					<div className="space-y-4 text-sm text-muted-foreground">
						<p>You now have access to all Pro features including:</p>
						<ul className="space-y-2 text-left max-w-sm mx-auto">
							<li className="flex items-start gap-2">
								<CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
								<span>Unlimited document uploads</span>
							</li>
							<li className="flex items-start gap-2">
								<CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
								<span>Advanced AI-powered study tools</span>
							</li>
							<li className="flex items-start gap-2">
								<CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
								<span>Priority support</span>
							</li>
							<li className="flex items-start gap-2">
								<CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
								<span>Export features and more</span>
							</li>
						</ul>
					</div>

					<div className="pt-4 space-y-3">
						<Button asChild size="lg" className="w-full sm:w-auto">
							<Link href="/dashboard">Go to Dashboard</Link>
						</Button>
						<p className="text-xs text-muted-foreground">
							A confirmation email has been sent to your registered email
							address.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default function BillingSuccessPage() {
	return (
		<Suspense
			fallback={
				<div className="container max-w-2xl mx-auto py-16">
					<Card className="text-center">
						<CardHeader>
							<div className="h-20 w-20 mx-auto bg-muted rounded-full animate-pulse" />
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="h-8 bg-muted rounded w-3/4 mx-auto animate-pulse" />
								<div className="h-4 bg-muted rounded w-1/2 mx-auto animate-pulse" />
							</div>
						</CardContent>
					</Card>
				</div>
			}
		>
			<SuccessContent />
			<SuccessPageClient />
		</Suspense>
	);
}
