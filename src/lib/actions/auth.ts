"use server";

import { type AuthErrorDetails, getAuthErrorMessage } from "@/lib/auth/errors";
import type { MagicLinkFormData } from "@/lib/auth/validation";
import { RateLimitError, rateLimiter } from "@/lib/rate-limit";
import { getServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/utils/site-url";
import { redirect } from "next/navigation";

export async function sendMagicLink(formData: MagicLinkFormData) {
	const rateLimitResult = await rateLimiter.checkMagicLinkRateLimit(
		formData.email
	);

	if (!rateLimitResult.isAllowed) {
		const resetMinutes = rateLimitResult.resetTime
			? Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000)
			: 5;

		throw new RateLimitError(
			`Too many magic link requests. Please try again in ${resetMinutes} minute${
				resetMinutes !== 1 ? "s" : ""
			}.`,
			rateLimitResult.remainingAttempts,
			rateLimitResult.resetTime
		);
	}

	const supabase = await getServerClient();

	const { data, error } = await supabase.auth.signInWithOtp({
		email: formData.email,
		options: {
			emailRedirectTo: `${getSiteUrl()}/auth/callback`,
			shouldCreateUser: true,
		},
	});

	if (error) {
		throw error;
	}

	return {
		success: true,
		data,
		remainingAttempts: rateLimitResult.remainingAttempts,
	};
}

type FormState = {
	error: AuthErrorDetails | null;
};

export async function signInWithOAuth(
	_prevState: FormState,
	_formData: FormData
): Promise<FormState> {
	try {
		const supabase = await getServerClient();
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${getSiteUrl()}/auth/callback`,
			},
		});

		if (error) {
			throw error;
		}

		if (data.url) {
			redirect(data.url);
		}

		throw new Error("Could not get OAuth URL.");
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"digest" in error &&
			typeof error.digest === "string" &&
			error.digest.startsWith("NEXT_REDIRECT")
		) {
			throw error;
		}

		console.error("Unknown error in signInWithOAuth:", error);
		return {
			error: getAuthErrorMessage(error),
		};
	}
}

export async function signOut() {
	const supabase = await getServerClient();
	const { error } = await supabase.auth.signOut();

	if (error) {
		console.error("Sign out error:", error);
		throw new Error("Could not sign out.");
	}

	return { success: true };
}
