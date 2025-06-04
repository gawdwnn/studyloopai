import { AuthError } from "@supabase/supabase-js";

export type AuthErrorType =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "email_not_verified"
  | "invalid_email"
  | "weak_password"
  | "email_exists"
  | "network_error"
  | "server_error"
  | "too_many_requests"
  | "unknown_error";

export interface AuthErrorDetails {
  type: AuthErrorType;
  message: string;
  field?: string;
}

export function getAuthErrorMessage(error: unknown): AuthErrorDetails {
  // Handle Supabase AuthError
  if (error instanceof AuthError) {
    // Check for error status code first
    const status = 'status' in error ? error.status : null;
    const code = 'code' in error ? error.code : null;
    
    if (status === 400) {
      // Handle 400 Bad Request errors
      switch (code) {
        case 'invalid_credentials':
        case 'invalid_grant':
          return {
            type: 'invalid_credentials',
            message: 'Invalid email or password',
            field: 'email',
          };
        case 'email_not_confirmed':
          return {
            type: 'email_not_confirmed',
            message: 'Please verify your email address before signing in',
            field: 'email',
          };
        case 'email_not_verified':
          return {
            type: 'email_not_verified',
            message: 'Please verify your email address before signing in',
            field: 'email',
          };
        case 'invalid_email':
          return {
            type: 'invalid_credentials',
            message: 'Invalid email format',
            field: 'email',
          };
        case 'weak_password':
          return {
            type: 'weak_password',
            message: 'Password is too weak. Please use a stronger password.',
            field: 'password',
          };
        case 'email_exists':
          return {
            type: 'email_exists',
            message: 'An account with this email already exists',
            field: 'email',
          };
      }
    } else if (status === 429) {
      // Rate limiting
      return {
        type: 'too_many_requests',
        message: 'Too many requests. Please try again later.',
      };
    } else if (status && status >= 500) {
      // Server errors
      return {
        type: 'server_error',
        message: 'Our servers are experiencing issues. Please try again later.',
      };
    }

    // Fallback for unhandled error codes
    return {
      type: 'server_error',
      message: error.message || 'An unexpected error occurred',
    };
  }

  // Handle network errors
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
