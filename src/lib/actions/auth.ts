"use server";

import { getServerClient } from "@/lib/supabase/server";

import { getSiteUrl } from "@/lib/get-site-url";
import type { PlanId } from "@/lib/plans/types";
import type { SignUpFormData } from "@/lib/validations/auth";

/**
 * Handles email signup with verification flow.
 * Creates user account and sends verification email.
 * User is NOT signed in after this action.
 */
export async function emailSignUp(formData: SignUpFormData, planId: PlanId) {
  const supabase = await getServerClient();

  const {
    data: { user },
    error: signUpError,
  } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      data: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        country: formData.country,
        selected_plan: planId,
      },
    },
  });

  if (signUpError) {
    throw signUpError;
  }

  if (!user) {
    throw new Error("Could not sign up user.");
  }

  return { user };
}
