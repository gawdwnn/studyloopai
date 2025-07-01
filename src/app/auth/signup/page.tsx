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
import { emailSignUp } from "@/lib/actions/auth";
import { createUserPlan } from "@/lib/actions/plans";
import { type AuthErrorDetails, getAuthErrorMessage } from "@/lib/errors/auth";
import type { PlanId } from "@/lib/plans/types";
import { cn } from "@/lib/utils";
import { type SignUpFormData, signUpSchema } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, MapPin, User, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

// only two countries supported for now
const countries = ["United States", "Canada"];

function SignUpFormComponent() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<AuthErrorDetails | null>(null);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [currentStep, setCurrentStep] = useState<"account" | "plan">("account");
	const [formData, setFormData] = useState<SignUpFormData | null>(null);

	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		// This effect handles the redirection for OAuth users
		// who need to complete the plan selection step.
		const step = searchParams.get("step");
		if (step === "plan") {
			setCurrentStep("plan");
		}
	}, [searchParams]);

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

	const onFirstStepSubmit = (data: SignUpFormData) => {
		// When the user completes the first form, we save the data
		// in state and move to the next step without submitting to the backend.
		setFormData(data);
		setCurrentStep("plan");
		setError(null); // Clear previous errors
	};

	const onFinalSubmit = async (planId: PlanId) => {
		setLoading(true);
		setError(null);

		// For email/password flow, formData will be populated.
		if (formData) {
			try {
				// This action sends a verification email. The user is NOT signed in yet.
				await emailSignUp(formData, planId);
				// On success, we redirect to a page telling the user to check their email.
				router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
			} catch (e) {
				const errorDetails = getAuthErrorMessage(e);
				setError(errorDetails);

				if (errorDetails.field) {
					form.setError(errorDetails.field as keyof SignUpFormData, {
						type: "manual",
						message: errorDetails.message,
					});
				}
				// Go back to the account step to show the error on the correct field.
				setCurrentStep("account");
			} finally {
				setLoading(false);
			}
		} else {
			// For OAuth flow, the user is already created, so we just create the plan.
			try {
				await createUserPlan(planId);
				router.push("/dashboard");
			} catch (e) {
				const errorDetails = getAuthErrorMessage(e);
				setError(errorDetails);
			} finally {
				setLoading(false);
			}
		}
	};

	return (
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
								currentStep === "account" ? "text-foreground" : "text-muted-foreground"
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
								currentStep === "plan" ? "font-medium text-foreground" : "text-muted-foreground"
							}`}
						>
							Pick plan
						</span>
					</div>
				</div>
			</div>
			<div className="text-center mb-6 lg:mb-8">
				<h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2">
					{currentStep === "account" ? "Create account" : "Pick your plan"}
				</h1>
				<p className="text-xs md:text-sm lg:text-base text-muted-foreground">
					{currentStep === "account"
						? "Join thousands of students accelerating their learning"
						: "Choose a plan that fits your learning style."}
				</p>
			</div>

			{currentStep === "account" ? (
				<>
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
							onSubmit={form.handleSubmit(onFirstStepSubmit)}
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
													aria-label={showPassword ? "Hide password" : "Show password"}
												>
													{showPassword ? (
														<EyeOff className="w-4 h-4" />
													) : (
														<Eye className="w-4 h-4" />
													)}
												</button>
											</div>
										</FormControl>
										<PasswordStrength password={field.value} className="mt-2" />
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
													onClick={() => setShowConfirmPassword(!showConfirmPassword)}
													className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
													aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
							<FormField
								control={form.control}
								name="country"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Country of Residence</FormLabel>
										<FormControl>
											<div className="relative group">
												<MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10 group-focus-within:text-primary transition-colors" />
												<Select onValueChange={field.onChange} value={field.value}>
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

							{/* Terms Agreement */}
							<FormField
								control={form.control}
								name="agreeToTerms"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center space-x-3 space-y-0">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={field.onChange}
												aria-label="Agree to terms and conditions"
											/>
										</FormControl>
										<div className="space-y-1 leading-none">
											<FormLabel className="text-xs sm:text-sm">
												I accept the{" "}
												<Link
													href="/legal/terms-of-service"
													className="text-primary hover:underline"
												>
													Terms of Use
												</Link>{" "}
												and{" "}
												<Link href="/legal/privacy-policy" className="text-primary hover:underline">
													Privacy Policy
												</Link>
											</FormLabel>
											<FormMessage />
										</div>
									</FormItem>
								)}
							/>

							<LoadingButton
								type="submit"
								className="w-full h-12 text-base"
								loading={loading}
								disabled={loading}
							>
								Next
							</LoadingButton>
						</form>
					</Form>
				</>
			) : (
				// The PlanSelection component is used for the second step.
				// It's also the entry point for OAuth users.
				<PlanSelection onComplete={onFinalSubmit} loading={loading} />
			)}

			<div className="mt-6 text-center">
				<span className="text-muted-foreground text-sm">
					Already have an account?{" "}
					<Link href="/auth/signin" className="text-primary hover:underline font-medium">
						Sign in
					</Link>
				</span>
			</div>
		</div>
	);
}

// The useSearchParams hook should be used within a Suspense boundary.
// We wrap the main component to ensure it works correctly.
export default function SignUpPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<SignUpFormComponent />
		</Suspense>
	);
}
