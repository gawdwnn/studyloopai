"use client";

import { getAuthErrorMessage } from "@/lib/errors/auth";
import { getSiteUrl } from "@/lib/get-site-url";
import { createClient } from "@/lib/supabase/client";
import type { SignInFormData, SignUpFormData } from "@/lib/validations/auth";
import { useRouter } from "next/navigation";

export function useAuth() {
  const router = useRouter();
  const supabase = createClient();

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

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: getAuthErrorMessage(error) };
      }
      router.push("/auth/signin");
      return { error: null };
    } catch (error) {
      return { error: getAuthErrorMessage(error) };
    }
  };

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

  const getUser = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: getAuthErrorMessage(error) };
    }
  };

  const getSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { session: data.session, error: null };
    } catch (error) {
      return { session: null, error: getAuthErrorMessage(error) };
    }
  };

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
