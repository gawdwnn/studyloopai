"use server";

import { getSiteUrl } from "@/lib/get-site-url";
import { RateLimitError, rateLimiter } from "@/lib/rate-limit";
import { getServerClient } from "@/lib/supabase/server";
import type { MagicLinkFormData } from "@/lib/validations/auth";

export async function sendMagicLink(formData: MagicLinkFormData) {
  const rateLimitResult = await rateLimiter.checkMagicLinkRateLimit(
    formData.email
  );

  if (!rateLimitResult.isAllowed) {
    const resetMinutes = rateLimitResult.resetTime
      ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000)
      : 5;

    throw new RateLimitError(
      `Too many magic link requests. Please try again in ${resetMinutes} minute${resetMinutes !== 1 ? "s" : ""}.`,
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

export async function signOut() {
  const supabase = await getServerClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  return { success: true };
}
