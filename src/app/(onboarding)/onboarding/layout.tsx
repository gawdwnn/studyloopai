"use client";

import {
	STEP_CONFIGS,
	StepValidationContext,
} from "@/components/step-validation-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
	completeOnboarding as completeOnboardingAction,
	skipOnboarding,
	trackStepSkipped,
	trackStepStarted,
	updateOnboardingStep,
} from "@/lib/actions/user";
import { logger } from "@/lib/utils/logger";
import {
	TOTAL_STEPS,
	useOnboardingProgress,
	useOnboardingStore,
} from "@/stores/onboarding-store";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { toast } from "sonner";

export default function OnboardingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const [isPending, startTransition] = useTransition();

	// Step validation state
	const [isStepValid, setIsStepValid] = useState(true);
	const [stepData, setStepData] = useState<Record<string, unknown> | null>(
		null
	);

	const currentStep = useOnboardingStore((state) => state.currentStep);
	const goToStep = useOnboardingStore((state) => state.goToStep);
	const completeOnboarding = useOnboardingStore(
		(state) => state.completeOnboarding
	);
	const getStepInfo = useOnboardingStore((state) => state.getStepInfo);

	// Synchronize store with URL pathname and track step starts
	useEffect(() => {
		const pathSegments = pathname.split("/");
		const stepSlug = pathSegments[pathSegments.length - 1];

		// Map step slug to step number
		const stepMapping: Record<string, number> = {
			"welcome-profile": 1,
			personalization: 2,
			billing: 3,
			completion: 4,
		};

		const urlStep = stepMapping[stepSlug];
		if (urlStep && urlStep !== currentStep) {
			goToStep(urlStep);

			// Track step start analytics
			trackStepStarted(urlStep).catch((error) => {
				logger.error("Failed to track step start analytics", {
					error: error instanceof Error ? error.message : String(error),
					step: urlStep,
				});
			});
		}
	}, [pathname, currentStep, goToStep]);

	const progress = useOnboardingProgress();
	const { title } = getStepInfo(currentStep);

	// Reset validation state when step changes - using a different approach
	const previousStep = useRef(currentStep);
	useEffect(() => {
		if (previousStep.current !== currentStep) {
			setIsStepValid(true);
			setStepData(null);
			previousStep.current = currentStep;
		}
	});

	const handleNext = useCallback(() => {
		if (currentStep === TOTAL_STEPS) {
			startTransition(async () => {
				await completeOnboardingAction();
				completeOnboarding();
				router.push("/dashboard");
			});
		} else {
			startTransition(async () => {
				// Save current step data if available
				if (stepData) {
					const result = await updateOnboardingStep(currentStep + 1, stepData);

					if (!result.success) {
						logger.error("Failed to save onboarding progress", {
							error: result.error,
							currentStep,
							stepData,
						});
						toast.error(
							result.error || "Unable to save your progress. Please try again."
						);
						return;
					}
				}

				// Update store optimistically for immediate UI feedback
				const nextStep = currentStep + 1;
				goToStep(nextStep);

				const nextSlug = getStepInfo(nextStep).slug;
				router.push(`/onboarding/${nextSlug}`);
			});
		}
	}, [
		currentStep,
		stepData,
		getStepInfo,
		router,
		completeOnboarding,
		goToStep,
	]);

	const handleBack = () => {
		if (currentStep > 1) {
			const prevSlug = getStepInfo(currentStep - 1).slug;
			router.push(`/onboarding/${prevSlug}`);
		}
	};

	const handleSkipAll = useCallback(() => {
		startTransition(async () => {
			await skipOnboarding();
			router.push("/dashboard");
		});
	}, [router]);

	const handleSkipCurrentStep = useCallback(() => {
		if (currentStep === TOTAL_STEPS) {
			// Can't skip completion step, redirect to finish
			handleNext();
			return;
		}

		startTransition(async () => {
			// Track step skip analytics
			await trackStepSkipped(currentStep, "user_skip");

			// Save current step data with skip marker if available
			const currentData = stepData || {};
			const skippedData = {
				...currentData,
				[`step${currentStep}Skipped`]: true,
			};

			// Move to next step with skip data
			const result = await updateOnboardingStep(currentStep + 1, skippedData);

			if (!result.success) {
				logger.error("Failed to skip onboarding step", {
					error: result.error,
					currentStep,
					stepData,
				});
				toast.error(
					result.error || "Unable to skip this step. Please try again."
				);
				return;
			}

			const nextSlug = getStepInfo(currentStep + 1).slug;
			router.push(`/onboarding/${nextSlug}`);
		});
	}, [currentStep, handleNext, router, stepData, getStepInfo]);

	const isLastStep = currentStep === TOTAL_STEPS;
	const canGoBack = currentStep > 1;
	const currentStepConfig = STEP_CONFIGS[currentStep];
	const canSkipCurrentStep = currentStepConfig?.canSkip ?? false;

	// Stable context functions to prevent infinite re-renders
	const stableSetStepValid = useCallback((isValid: boolean) => {
		setIsStepValid(isValid);
	}, []);

	const stableGetStepData = useCallback(() => stepData, [stepData]);

	const stableSetStepData = useCallback((data: Record<string, unknown>) => {
		setStepData(data);
	}, []);

	// Memoized context value for step validation to prevent unnecessary re-renders
	const validationContextValue = useMemo(
		() => ({
			setStepValid: stableSetStepValid,
			getStepData: stableGetStepData,
			setStepData: stableSetStepData,
			// Enhanced skip functionality
			canSkipStep: canSkipCurrentStep,
			skipCurrentStep: handleSkipCurrentStep,
			skipAllOnboarding: handleSkipAll,
		}),
		[
			stableSetStepValid,
			stableGetStepData,
			stableSetStepData,
			canSkipCurrentStep,
			handleSkipCurrentStep,
			handleSkipAll,
		]
	);

	return (
		<div className="flex flex-col min-h-screen bg-background">
			{/* Header */}
			<header className="fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<Link href="/" className="flex items-center gap-2">
							<span className="font-bold text-xl">StudyLoopAI</span>
						</Link>
						<Button
							variant="outline"
							onClick={handleSkipAll}
							disabled={isPending}
							className="border-2 hover:bg-accent font-medium"
						>
							{isPending ? "Skipping..." : "Skip entire setup →"}
						</Button>
					</div>
				</div>
				<Progress value={progress} className="h-1" />
			</header>

			{/* Main Content */}
			<main className="flex-1 flex flex-col items-center justify-center pt-16">
				<div className="w-full max-w-6xl px-4 py-16">
					<AnimatePresence mode="wait">
						<motion.div
							key={pathname}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3 }}
						>
							<div className="text-center mb-8">
								<p className="text-sm font-semibold text-primary">
									Step {currentStep} of {TOTAL_STEPS}
								</p>
								<h1 className="text-3xl font-bold mt-2">{title}</h1>
							</div>
							<StepValidationContext.Provider value={validationContextValue}>
								{children}
							</StepValidationContext.Provider>
						</motion.div>
					</AnimatePresence>
				</div>
			</main>

			{/* Footer */}
			<footer className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-20">
						<div>
							{canGoBack && (
								<Button variant="ghost" onClick={handleBack}>
									<ArrowLeft className="h-4 w-4 mr-2" />
									Back
								</Button>
							)}
						</div>
						<div className="flex items-center gap-3">
							{/* Step-specific skip button */}
							{canSkipCurrentStep && !isLastStep && (
								<Button
									variant="outline"
									onClick={handleSkipCurrentStep}
									disabled={isPending}
									className="text-sm"
									title={`Skip ${currentStepConfig?.title || "this step"} and continue`}
								>
									Skip this step
								</Button>
							)}
							{/* Main Next/Finish button */}
							<Button onClick={handleNext} disabled={isPending || !isStepValid}>
								{isLastStep
									? isPending
										? "Finishing..."
										: "Finish"
									: isPending
										? "Saving..."
										: "Next"}
								{!isLastStep && <ArrowRight className="h-4 w-4 ml-2" />}
							</Button>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
