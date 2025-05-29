"use client";

import { LoadingButton } from "@/components/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { type AuthErrorDetails, getAuthErrorMessage } from "@/lib/errors/auth";
import { getBrowserClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthErrorDetails | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = getBrowserClient();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (error) {
      const errorDetails = getAuthErrorMessage(error);
      setError(errorDetails);

      if (errorDetails.field) {
        form.setError(errorDetails.field as keyof ForgotPasswordFormData, {
          type: "manual",
          message: errorDetails.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card px-4 py-8 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We've sent you an email with a link to reset your password. Please
              check your inbox and follow the instructions.
            </p>
            <div className="mt-6">
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                Return to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-card px-4 py-8 shadow sm:rounded-lg sm:px-10">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            Forgot your password?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && !error.field && (
              <Alert variant="destructive">
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
                      <Input
                        type="email"
                        placeholder="mail@mail.com"
                        className="pl-10 focus:ring-2 focus:ring-primary/20 transition-all"
                        aria-label="Email address"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <LoadingButton
              type="submit"
              className="w-full h-12 text-base"
              loading={loading}
              loadingText="Sending reset link..."
            >
              Send Reset Link
            </LoadingButton>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
