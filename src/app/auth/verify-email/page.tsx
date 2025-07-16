"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyEmailContent() {
	const searchParams = useSearchParams();
	const email = searchParams.get("email");

	if (!email) {
		return (
			<div className="text-center">
				<h2 className="text-2xl font-bold text-destructive">Invalid Link</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					The verification link is missing required information. Please return to the sign-in page.
				</p>
				<div className="mt-6">
					<Link
						href="/auth/signin"
						className="text-sm font-medium text-primary hover:text-primary/80"
					>
						Return to sign in
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="text-center">
			<MailCheck className="mx-auto h-12 w-12 text-primary" />
			<h2 className="mt-4 text-2xl font-bold text-foreground">Check your email</h2>
			<p className="mt-2 text-sm text-muted-foreground">
				We've sent a magic link to <span className="font-bold text-foreground">{email}</span>.
				Please check your inbox and click the link to sign in.
			</p>
			<p className="mt-4 text-xs text-muted-foreground">
				The link will expire in 1 hour for security purposes.
			</p>

			<div className="mt-6">
				<Link
					href="/auth/signin"
					className="text-sm font-medium text-primary hover:text-primary/80"
				>
					Try a different email
				</Link>
			</div>
		</div>
	);
}

export default function VerifyEmailPage() {
	return (
		<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
			<div className="bg-card px-4 py-8 shadow sm:rounded-lg sm:px-10">
				<Suspense fallback={<div>Loading...</div>}>
					<VerifyEmailContent />
				</Suspense>
			</div>
		</div>
	);
}
