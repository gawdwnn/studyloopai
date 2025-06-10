"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyEmailContent() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const { getUser, resendVerificationEmail } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchEmailAddress = async () => {
      try {
        // First try to get email from URL parameters (for new flow)
        const emailFromParams = searchParams.get("email");
        if (emailFromParams) {
          setEmail(emailFromParams);
          setLoading(false);
          return;
        }

        // Fallback: try to get email from authenticated user (for existing flow)
        const { user } = await getUser();
        setEmail(user?.email ?? null);
      } catch {
        // If no user and no email param, we can't show the page properly
        setEmail(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEmailAddress();
  }, [getUser, searchParams]);

  const handleResendEmail = async () => {
    if (!email) return;

    setResendLoading(true);
    setResendStatus("idle");
    setResendError(null);

    try {
      const { error } = await resendVerificationEmail(email);

      if (error) {
        setResendStatus("error");
        setResendError(
          error.message ||
            "Failed to resend verification email. Please try again."
        );
        return;
      }

      setResendStatus("success");
    } catch {
      setResendStatus("error");
      setResendError("An unexpected error occurred. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If we don't have an email address, show a generic message
  if (!email) {
    return (
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl font-bold">
              Check your email
            </CardTitle>
            <CardDescription className="text-center">
              We've sent you a verification link to complete your registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                To complete your registration, please click the verification
                link in the email we just sent you.
              </p>
              <p>If you don't see the email, please check your spam folder.</p>
            </div>

            <div className="flex flex-col space-y-3">
              <Link href="/auth/signin" className="w-full">
                <Button variant="outline" className="w-full">
                  Return to sign in
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl font-bold">
            Check your email
          </CardTitle>
          <CardDescription className="text-center">
            We've sent a verification link to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              To complete your registration, please click the verification link
              in the email we just sent you.
            </p>
            <p>
              If you don't see the email, please check your spam folder or try
              resending the verification email.
            </p>
          </div>

          {/* Resend Status Messages */}
          {resendStatus === "success" && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Verification email sent successfully! Check your inbox.
              </AlertDescription>
            </Alert>
          )}

          {resendStatus === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{resendError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col space-y-3">
            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={resendLoading}
              className="w-full"
            >
              {resendLoading ? "Resending..." : "Resend verification email"}
            </Button>
            <Link href="/auth/signin" className="w-full">
              <Button variant="ghost" className="w-full">
                Return to sign in
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
