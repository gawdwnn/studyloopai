"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordStrength } from "@/components/auth/password-strength";
import { PlanSelection } from "@/components/auth/plan-selection";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createUserPlan } from "@/lib/actions/plans";
import { type AuthErrorDetails, getAuthErrorMessage } from "@/lib/errors/auth";
import { getBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { type SignUpFormData, signUpSchema } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Mail, MapPin, Star, User, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

// only two countries supported for now
const countries = ["United States", "Canada"];

const testimonials = [
  {
    quote:
      "StudyLoop enables me to customise and supercharge my learning by focusing on actually understanding the content rather than spending time and energy on tedious note-taking without proper digestion.",
    author: "Martin",
    rating: 5,
    avatar: "M",
  },
  {
    quote:
      "The AI-powered study tools have completely transformed how I approach learning. My retention has improved dramatically.",
    author: "Sarah Chen",
    rating: 5,
    avatar: "S",
  },
  {
    quote:
      "Finally, a platform that understands how modern students learn. The personalized approach is game-changing.",
    author: "Alex Rodriguez",
    rating: 5,
    avatar: "A",
  },
];

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthErrorDetails | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [currentStep, setCurrentStep] = useState<"account" | "plan">("account");
  const [formData, setFormData] = useState<SignUpFormData | null>(null);
  const router = useRouter();
  const supabase = getBrowserClient();

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      country: "",
      agreeToTerms: false,
    },
  });

  const onFirstStepComplete = async (data: SignUpFormData) => {
    setFormData(data);
    setCurrentStep("plan");
  };

  const onPlanSelected = async (plan: "free" | "yearly" | "monthly") => {
    setLoading(true);
    setError(null);

    try {
      if (!formData) throw new Error("Form data is missing");

      // First create the user account
      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            country: formData.country,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Then create the user plan
      await createUserPlan(plan);

      router.push("/auth/verify-email");
    } catch (error) {
      const errorDetails = getAuthErrorMessage(error);
      setError(errorDetails);

      if (errorDetails.field && currentStep === "account") {
        form.setError(errorDetails.field as keyof SignUpFormData, {
          type: "manual",
          message: errorDetails.message,
        });
        setCurrentStep("account");
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Hero/Testimonial Section - Hidden on mobile */}
      <motion.div
        className="hidden md:flex md:w-2/5 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 relative overflow-hidden flex-col justify-center items-center p-8 lg:p-12 min-h-[40vh] md:min-h-screen"
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

        {/* Testimonial */}
        <AnimatePresence mode="wait">
          <motion.div
            className="max-w-sm lg:max-w-md text-center text-white z-10"
            key={currentTestimonial}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 lg:mb-6">
              <div className="flex justify-center mb-2 lg:mb-3">
                {Array.from(
                  { length: testimonials[currentTestimonial].rating },
                  (_, i) => (
                    <Star
                      key={`${testimonials[currentTestimonial].author}-star-${i}`}
                      className="w-4 h-4 lg:w-5 lg:h-5 fill-yellow-400 text-yellow-400"
                    />
                  )
                )}
              </div>
              <blockquote className="text-sm lg:text-lg xl:text-xl leading-relaxed mb-3 lg:mb-4 italic">
                "{testimonials[currentTestimonial].quote}"
              </blockquote>
              <div className="flex items-center justify-center space-x-2 lg:space-x-3">
                <div className="w-8 h-8 lg:w-12 lg:h-12 bg-white/20 rounded-full flex items-center justify-center font-semibold text-sm lg:text-base">
                  {testimonials[currentTestimonial].avatar}
                </div>
                <span className="font-medium text-sm lg:text-base">
                  {testimonials[currentTestimonial].author}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Testimonial Indicators */}
        <div className="flex justify-center space-x-2 mt-4">
          {testimonials.map((testimonial, index) => (
            <button
              key={`indicator-${testimonial.author}`}
              type="button"
              onClick={() => setCurrentTestimonial(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentTestimonial ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Stats */}
        <motion.div
          className="absolute bottom-4 left-4 right-4 lg:bottom-8 lg:left-8 lg:right-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <div className="flex justify-center space-x-6 lg:space-x-8 text-white/80 text-xs lg:text-sm">
            <div className="text-center">
              <div className="font-bold text-lg lg:text-xl">10K+</div>
              <div>Students</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg lg:text-xl">4.9★</div>
              <div>Rating</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg lg:text-xl">95%</div>
              <div>Success Rate</div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Right Side - Form Section */}
      <motion.div
        className="md:w-3/5 bg-background flex flex-col justify-center p-6 lg:p-8 xl:p-12"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div
          className={cn(
            "mx-auto w-full rounded-xl shadow-lg p-8 sm:p-10",
            currentStep === "account" ? "max-w-xl" : "max-w-full"
          )}
        >
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-6 lg:mb-8">
            <div className="flex items-center space-x-3 lg:space-x-4">
              <div className="flex items-center">
                <div
                  className={`w-7 h-7 lg:w-8 lg:h-8 ${
                    currentStep === "account"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  } rounded-full flex items-center justify-center text-xs lg:text-sm font-medium`}
                >
                  1
                </div>
                <span
                  className={`ml-2 text-xs lg:text-sm font-medium ${
                    currentStep === "account"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Create account
                </span>
              </div>
              <div className="w-6 lg:w-8 h-px bg-border" />
              <div className="flex items-center">
                <div
                  className={`w-7 h-7 lg:w-8 lg:h-8 ${
                    currentStep === "plan"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  } rounded-full flex items-center justify-center text-xs lg:text-sm`}
                >
                  2
                </div>
                <span
                  className={`ml-2 text-xs lg:text-sm ${
                    currentStep === "plan"
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Pick plan
                </span>
              </div>
            </div>
          </div>

          <div className="text-center mb-6 lg:mb-8">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2">
              {currentStep === "account" ? "Create account" : "Pick plan"}
            </h1>
            <p className="text-xs md:text-sm lg:text-base text-muted-foreground">
              {currentStep === "account"
                ? "Join thousands of students accelerating their learning"
                : "Choose a plan that fits your needs"}
            </p>
          </div>

          {currentStep === "account" ? (
            <>
              {/* Social Sign Up Button */}
              <div className="mb-6">
                <GoogleSignInButton variant="signup" onError={setError} />
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
                <form
                  onSubmit={form.handleSubmit(onFirstStepComplete)}
                  className="space-y-4 lg:space-y-6"
                >
                  {error && !error.field && (
                    <Alert variant="destructive">
                      <AlertDescription>{error.message}</AlertDescription>
                    </Alert>
                  )}

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First name</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
                              <Input
                                placeholder="John"
                                className="pl-10 focus:ring-2 focus:ring-primary/20 transition-all"
                                aria-label="First name"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last name</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
                              <Input
                                placeholder="Doe"
                                className="pl-10 focus:ring-2 focus:ring-primary/20 transition-all"
                                aria-label="Last name"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                              placeholder="••••••••"
                              className="pr-10 focus:ring-2 focus:ring-primary/20 transition-all"
                              aria-label="Password"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                        <div className="space-y-2">
                          <PasswordStrength
                            password={field.value}
                            className="mt-2"
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Confirm Password */}
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="pr-10 focus:ring-2 focus:ring-primary/20 transition-all"
                              aria-label="Confirm password"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={
                                showConfirmPassword
                                  ? "Hide password"
                                  : "Show password"
                              }
                            >
                              {showConfirmPassword ? (
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

                  {/* Country */}
                  <div className="w-full">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country of Residence</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10 group-focus-within:text-primary transition-colors" />
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <SelectTrigger className="w-full pl-10 focus:ring-2 focus:ring-primary/20 transition-all">
                                  <SelectValue placeholder="Select your country" />
                                </SelectTrigger>
                                <SelectContent>
                                  {countries.map((country) => (
                                    <SelectItem key={country} value={country}>
                                      {country}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="agreeToTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              aria-label="Agree to terms and conditions"
                              className="mt-1 flex-shrink-0"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-xs sm:text-sm">
                              <span className="block sm:inline">I accept the{" "}</span>
                              <Link
                                href="/legal/terms-of-service"
                                className="text-primary hover:underline text-xs sm:text-sm"
                              >
                                Terms of Use
                              </Link>{" "}
                              <span className="block sm:inline">and{" "}</span>
                              <Link
                                href="/legal/privacy-policy"
                                className="text-primary hover:underline text-xs sm:text-sm"
                              >
                                Privacy Policy
                              </Link>
                            </FormLabel>
                            <FormMessage className="text-xs" />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <LoadingButton
                    type="submit"
                    className="w-full h-12 text-base"
                    loading={loading}
                    loadingText="Processing..."
                  >
                    Next
                  </LoadingButton>
                </form>
              </Form>
            </>
          ) : (
            <PlanSelection onComplete={onPlanSelected} loading={loading} />
          )}

          <div className="mt-6 text-center">
            <span className="text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
