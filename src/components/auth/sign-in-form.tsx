"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { sendMagicLink } from "@/lib/actions/auth";
import { type AuthErrorDetails, getAuthErrorMessage } from "@/lib/errors/auth";
import type { MagicLinkFormData } from "@/lib/validations/auth";
import { X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function SignInForm() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<AuthErrorDetails | null>(null);
	const searchParams = useSearchParams();

	useEffect(() => {
		const urlError = searchParams.get("error");
		const errorDescription = searchParams.get("error_description");
		if (urlError) {
			setError(getAuthErrorMessage(new Error(errorDescription ?? "An error occurred.")));
		}
	}, [searchParams]);

	const handleMagicLinkSubmit = useCallback(async (data: MagicLinkFormData) => {
		setLoading(true);
		setError(null);

		try {
			await sendMagicLink(data);
		} catch (e) {
			const errorDetails = getAuthErrorMessage(e);
			setError(errorDetails);
		} finally {
			setLoading(false);
		}
	}, []);

	const handleOAuthError = useCallback((oauthError: AuthErrorDetails) => {
		setError(oauthError);
	}, []);

	return (
		<div className="mx-auto w-full max-w-md rounded-xl p-6 sm:p-8">
			<div className="text-center mb-6">
				<h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">
					Welcome to StudyLoopAI
				</h1>
				<p className="text-sm md:text-base text-muted-foreground">
					Sign in to your account or create a new one
				</p>
			</div>

			{error && (
				<div className="mb-6">
					<Alert variant="destructive" className="relative">
						<AlertDescription className="pr-8">{error.message}</AlertDescription>
						<button
							type="button"
							onClick={() => setError(null)}
							className="absolute right-2 top-2 opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:ring-offset-2 rounded"
							aria-label="Dismiss error message"
						>
							<X className="h-4 w-4" aria-hidden="true" />
						</button>
					</Alert>
				</div>
			)}

			{/* Google OAuth */}
			<div className="mb-6">
				<GoogleSignInButton variant="signin" onError={handleOAuthError} />
			</div>

			{/* Separator */}
			<div className="relative mb-6">
				<div className="absolute inset-0 flex items-center">
					<Separator className="w-full" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
				</div>
			</div>

			{/* Magic Link Form */}
			<MagicLinkForm
				onSubmit={handleMagicLinkSubmit}
				loading={loading}
				error={null}
				placeholder="your.email@example.com"
			/>

			{/* Footer */}
			<div className="mt-8 text-center space-y-4">
				<div className="text-xs text-muted-foreground">
					By continuing, you agree to{" "}
					<Link href="/legal/terms-of-service" className="text-primary hover:underline">
						Terms of Service
					</Link>{" "}
					and{" "}
					<Link href="/legal/privacy-policy" className="text-primary hover:underline">
						Privacy Policy
					</Link>
				</div>

				<div className="text-xs text-muted-foreground">
					New to StudyLoop? No worries! We'll create your account automatically when you sign in.
				</div>
			</div>
		</div>
	);
}
