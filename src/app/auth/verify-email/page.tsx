"use client";

import { LoadingButton } from "@/components/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import type { AuthErrorDetails } from "@/lib/errors/auth";
import { getAuthErrorMessage } from "@/lib/errors/auth";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function VerifyEmailContent() {
	const searchParams = useSearchParams();
	const email = searchParams.get("email");
	const { resendVerificationEmail } = useAuth();

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<AuthErrorDetails | null>(null);
	const [success, setSuccess] = useState(false);

	const handleResend = async () => {
		if (!email) {
			setError({
				type: "unknown_error",
				message: "Email not found in URL. Please go back and try signing up again.",
			});
			return;
		}
		setLoading(true);
		setError(null);
		setSuccess(false);

		const { error: resendError } = await resendVerificationEmail(email);

		if (resendError) {
			setError(getAuthErrorMessage(resendError));
		} else {
			setSuccess(true);
		}
		setLoading(false);
	};

	if (!email) {
		return (
			<div className="text-center">
				<h2 className="text-2xl font-bold text-destructive">Invalid Link</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					The verification link is missing required information. Please return to the sign-up page.
				</p>
				<div className="mt-6">
					<Link
						href="/auth/signup"
						className="text-sm font-medium text-primary hover:text-primary/80"
					>
						Return to sign up
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="text-center">
			<MailCheck className="mx-auto h-12 w-12 text-primary" />
			<h2 className="mt-4 text-2xl font-bold text-foreground">Verify your email</h2>
			<p className="mt-2 text-sm text-muted-foreground">
				We've sent a verification link to <span className="font-bold text-foreground">{email}</span>
				. Please check your inbox and click the link to complete your signup.
			</p>

			<div className="mt-6 space-y-4">
				{success && (
					<Alert variant="default" className="text-left">
						<AlertDescription>
							A new verification link has been sent to your email address.
						</AlertDescription>
					</Alert>
				)}
				{error && (
					<Alert variant="destructive" className="text-left">
						<AlertDescription>{error.message}</AlertDescription>
					</Alert>
				)}
				<LoadingButton
					onClick={handleResend}
					loading={loading}
					className="w-full"
					loadingText="Sending..."
				>
					Resend verification link
				</LoadingButton>
			</div>

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
