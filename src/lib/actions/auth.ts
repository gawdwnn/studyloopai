"use server";

import { type AuthErrorDetails, getAuthErrorMessage } from "@/lib/auth/errors";
import type { MagicLinkFormData } from "@/lib/auth/validation";
import { checkAuthRateLimit, enforceRateLimit } from "@/lib/rate-limit";
import { getServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { getSiteUrl } from "@/lib/utils/site-url";
import { redirect } from "next/navigation";

export async function sendMagicLink(formData: MagicLinkFormData) {
	const rateLimitResult = await checkAuthRateLimit(formData.email);

	await enforceRateLimit(async () => rateLimitResult, "magic link");

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
		remainingAttempts: rateLimitResult.remaining,
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

		logger.error("OAuth sign-in failed", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			action: "signInWithOAuth",
			provider: "google",
		});
		return {
			error: getAuthErrorMessage(error),
		};
	}
}

export async function signOut() {
	const supabase = await getServerClient();
	const { error } = await supabase.auth.signOut();

	if (error) {
		logger.error("Sign out failed", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			action: "signOut",
		});
		throw new Error("Could not sign out.");
	}

	return { success: true };
}
