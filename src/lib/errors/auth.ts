import { AuthError } from "@supabase/supabase-js";

export type AuthErrorType =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "network_error"
  | "server_error"
  | "unknown_error";

export interface AuthErrorDetails {
  type: AuthErrorType;
  message: string;
  field?: string;
}

export function getAuthErrorMessage(error: unknown): AuthErrorDetails {
  if (error instanceof AuthError) {
    switch (error.message) {
      case "Invalid credentials":
        return {
          type: "invalid_credentials",
          message: "Invalid email or password",
          field: "email",
        };
      case "Email not confirmed":
        return {
          type: "email_not_confirmed",
          message: "Please verify your email address before signing in",
          field: "email",
        };
      case "Network error":
        return {
          type: "network_error",
          message: "Please check your internet connection and try again",
        };
      default:
        return {
          type: "server_error",
          message: "An unexpected error occurred. Please try again later.",
        };
    }
  }

  if (error instanceof Error) {
    return {
      type: "unknown_error",
      message: error.message,
    };
  }

  return {
    type: "unknown_error",
    message: "An unexpected error occurred",
  };
}
