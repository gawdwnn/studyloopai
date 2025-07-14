"use client";

import { getAuthErrorMessage } from "@/lib/errors/auth";
import { getSiteUrl } from "@/lib/get-site-url";
import { createClient } from "@/lib/supabase/client";
import type { MagicLinkFormData } from "@/lib/validations/auth";
import { useRouter } from "next/navigation";

export function useAuth() {
  const router = useRouter();
  const supabase = createClient();

  const sendMagicLink = async (data: MagicLinkFormData) => {
    try {
      const { error, data: authData } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: `${getSiteUrl()}/auth/callback`,
          shouldCreateUser: true, // Allow new user creation
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

  const resendMagicLink = async (email: string) => {
    return await sendMagicLink({ email });
  };

  return {
    sendMagicLink,
    signInWithOAuth,
    signOut,
    getUser,
    getSession,
    resendMagicLink,
  };
}
