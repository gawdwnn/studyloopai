"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import { getSiteUrl } from "@/lib/get-site-url";
import type { PlanId } from "@/lib/plans/types";
import type { SignUpFormData } from "@/lib/validations/auth";

/**
 * Handles email signup with verification flow.
 * Creates user account and sends verification email.
 * User is NOT signed in after this action.
 */
export async function emailSignUp(formData: SignUpFormData, planId: PlanId) {
  const supabase = createServerActionClient({ cookies });

  // Create user in Supabase auth with email verification
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
        selected_plan: planId, // Store the selected plan to be used after verification
      },
    },
  });

  if (signUpError) {
    throw new Error(signUpError.message);
  }

  if (!user) {
    throw new Error("Could not sign up user.");
  }

  return { user };
}
