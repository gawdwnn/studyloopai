"use client";

import { getAuthErrorMessage } from "@/lib/errors/auth";
import type { SignInFormData, SignUpFormData } from "@/lib/validations/auth";
import { createBrowserClient } from "@supabase/ssr";

// Helper function to get the correct site URL
const getSiteUrl = () => {
  // Use the browser's origin, which is reliable for both local and production.
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Fallback for server-side rendering.
  // Vercel provides NEXT_PUBLIC_VERCEL_URL.
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000"
  );
};

export function useAuth() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  // Sign in with email and password
  const signInWithPassword = async (data: SignInFormData) => {
    try {
      const { error, data: authData } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;
      return { error: null, data: authData };
    } catch (error) {
      const errorDetails = getAuthErrorMessage(error);
      return { error: errorDetails, data: null };
    }
  };

  // Sign up with email and password
  const signUp = async (data: SignUpFormData) => {
    try {
      const { error, data: authData } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${getSiteUrl()}/auth/callback`,
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            country: data.country,
          },
        },
      });

      if (error) throw error;
      return { error: null, data: authData };
    } catch (error) {
      const errorDetails = getAuthErrorMessage(error);
      return { error: errorDetails, data: null };
    }
  };

  // Sign in with OAuth provider (currently Google)
  const signInWithOAuth = async (provider: "google") => {
    try {
      const { error, data } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${getSiteUrl()}/auth/callback`,
        },
      });

      if (error) throw error;
      return { error: null, data };
    } catch (error) {
      const errorDetails = getAuthErrorMessage(error);
      return { error: errorDetails, data: null };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: getAuthErrorMessage(error) };
      }

      // Redirect after successful signout
      window.location.assign("/auth/signin");
      return { error: null };
    } catch (error) {
      return { error: getAuthErrorMessage(error) };
    }
  };

  // Reset password for email
  const resetPasswordForEmail = async (email: string) => {
    try {
      const redirectUrl = `${getSiteUrl()}/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: getAuthErrorMessage(error) };
    }
  };

  // Update user password (for reset password flow)
  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: getAuthErrorMessage(error) };
    }
  };

  // Get current user
  const getUser = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: getAuthErrorMessage(error) };
    }
  };

  // Get current session
  const getSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { session: data.session, error: null };
    } catch (error) {
      return { session: null, error: getAuthErrorMessage(error) };
    }
  };

  // Resend verification email
  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${getSiteUrl()}/auth/callback`,
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: getAuthErrorMessage(error) };
    }
  };

  return {
    signInWithPassword,
    signUp,
    signInWithOAuth,
    signOut,
    resetPasswordForEmail,
    updatePassword,
    getUser,
    getSession,
    resendVerificationEmail,
  };
}
