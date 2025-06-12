"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoadingButton } from "@/components/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { type AuthErrorDetails, getAuthErrorMessage } from "@/lib/errors/auth";
import { type SignInFormData, signInSchema } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

function SignInForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthErrorDetails | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithPassword } = useAuth();

  useEffect(() => {
    const urlError = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    if (urlError) {
      setError(
        getAuthErrorMessage(new Error(errorDescription ?? "An error occurred."))
      );
    }
  }, [searchParams]);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    setLoading(true);
    setError(null);

    const { error: signInError } = await signInWithPassword(data);

    if (signInError) {
      setError(signInError);

      // If the error is field-specific, set it on the form
      if (signInError.field) {
        form.setError(signInError.field as keyof SignInFormData, {
          type: "manual",
          message: signInError.message,
        });
      }
    } else {
      router.push("/dashboard");
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-xl p-8 sm:p-10">
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Sign in
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Welcome back! Log in to unlock your AI-powered study tools.
        </p>
      </div>

      {/* Social Sign In Button */}
      <div className="mb-6">
        <GoogleSignInButton variant="signin" onError={setError} />
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {/* Email */}
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
                      autoComplete="email"
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
          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pr-10 focus:ring-2 focus:ring-primary/20 transition-all"
                      aria-label="Password"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                aria-label="Remember me"
              />
              <label
                htmlFor="remember"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Remember me
              </label>
            </div>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-primary hover:underline font-medium"
            >
              Forgot your password?
            </Link>
          </div>
          <LoadingButton
            type="submit"
            className="w-full h-12 text-base"
            loading={loading}
            loadingText="Signing in..."
          >
            Sign in
          </LoadingButton>
        </form>
      </Form>
      <div className="mt-6 text-center">
        <span className="text-muted-foreground text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="text-primary hover:underline font-medium"
          >
            Sign up
          </Link>
        </span>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const [currentQuote, setCurrentQuote] = useState(0);
  const quotes = [
    {
      text: "Education is the most powerful weapon which you can use to change the world.",
      author: "Nelson Mandela",
    },
    {
      text: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
      author: "Mahatma Gandhi",
    },
    {
      text: "The beautiful thing about learning is that no one can take it away from you.",
      author: "B.B. King",
    },
    {
      text: "The expert in anything was once a beginner.",
      author: "Helen Hayes",
    },
    {
      text: "Success is the sum of small efforts, repeated day in and day out.",
      author: "Robert Collier",
    },
    {
      text: "Learning never exhausts the mind.",
      author: "Leonardo da Vinci",
    },
  ];

  // Auto-rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Hero/Quote Section - Hidden on mobile */}
      <motion.div
        className="hidden md:flex lg:w-1/2 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 relative overflow-hidden flex-col justify-center items-center p-8 lg:p-12 min-h-[40vh] md:min-h-screen"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full blur-xl" />
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-white rounded-full blur-lg" />
          <div className="absolute top-1/2 left-10 w-16 h-16 bg-white rounded-full blur-md" />
        </div>
        {/* Rotating Quote */}
        <AnimatePresence mode="wait">
          <motion.div
            className="max-w-sm lg:max-w-md text-center text-white z-10"
            key={quotes[currentQuote].author}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
          >
            <blockquote className="text-lg xl:text-2xl leading-relaxed mb-4 italic font-medium">
              "{quotes[currentQuote].text}"
            </blockquote>
            <div className="flex items-center justify-center space-x-2 lg:space-x-3">
              <span className="font-semibold text-base lg:text-lg opacity-80">
                — {quotes[currentQuote].author}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
        {/* Quote Indicators */}
        <div className="flex justify-center space-x-2 mt-4">
          {quotes.map((quote, index) => (
            <button
              key={quote.author}
              type="button"
              onClick={() => setCurrentQuote(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentQuote ? "bg-white" : "bg-white/30"
              }`}
              aria-label={`Show quote by ${quote.author}`}
            />
          ))}
        </div>
      </motion.div>

      {/* Right Side - Form Section */}
      <motion.div
        className="lg:w-1/2 bg-background flex flex-col justify-center p-6 lg:p-8 xl:p-12"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <Suspense fallback={<div>Loading...</div>}>
          <SignInForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
