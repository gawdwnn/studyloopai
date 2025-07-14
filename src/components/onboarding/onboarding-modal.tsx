"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
	ONBOARDING_STEPS,
	useOnboardingProgress,
	useOnboardingStore,
} from "@/lib/stores/onboarding-store";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, SkipForward, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CompletionStep } from "./steps/completion-step";
import { PlanSelectionStep } from "./steps/plan-selection-step";
import { PreferencesStep } from "./steps/preferences-step";
import { ProfileStep } from "./steps/profile-step";
import { StudyGoalsStep } from "./steps/study-goals-step";
import { WelcomeStep } from "./steps/welcome-step";

export function OnboardingModal() {
	const {
		isVisible,
		currentStep,
		hideOnboarding,
		nextStep,
		previousStep,
		skipCurrentStep,
		skipAllRemaining,
		completeOnboarding,
		trackTimeOnStep,
	} = useOnboardingStore();

	const { progressPercentage, totalSteps } = useOnboardingProgress();

	const [stepStartTime, setStepStartTime] = useState<number>(Date.now());

	// Track time spent on each step
	useEffect(() => {
		setStepStartTime(Date.now());

		return () => {
			const timeSpent = Date.now() - stepStartTime;
			trackTimeOnStep(currentStep, timeSpent);
		};
	}, [currentStep, trackTimeOnStep, stepStartTime]);

	const handleNext = () => {
		if (currentStep === totalSteps) {
			completeOnboarding();
		} else {
			nextStep();
		}
	};

	const handleSkip = () => {
		if (currentStep === totalSteps) {
			completeOnboarding();
		} else {
			skipCurrentStep();
		}
	};

	const handleClose = () => {
		// Allow closing, but track as skipping all remaining
		skipAllRemaining();
		hideOnboarding();
	};

	const getStepContent = () => {
		switch (currentStep) {
			case ONBOARDING_STEPS.WELCOME:
				return <WelcomeStep />;
			case ONBOARDING_STEPS.PROFILE:
				return <ProfileStep />;
			case ONBOARDING_STEPS.STUDY_GOALS:
				return <StudyGoalsStep />;
			case ONBOARDING_STEPS.PREFERENCES:
				return <PreferencesStep />;
			case ONBOARDING_STEPS.PLAN_SELECTION:
				return <PlanSelectionStep />;
			case ONBOARDING_STEPS.COMPLETION:
				return <CompletionStep />;
			default:
				return <WelcomeStep />;
		}
	};

	const getStepTitle = () => {
		switch (currentStep) {
			case ONBOARDING_STEPS.WELCOME:
				return "Welcome to StudyLoop!";
			case ONBOARDING_STEPS.PROFILE:
				return "Tell us about yourself";
			case ONBOARDING_STEPS.STUDY_GOALS:
				return "What are your study goals?";
			case ONBOARDING_STEPS.PREFERENCES:
				return "Set your preferences";
			case ONBOARDING_STEPS.PLAN_SELECTION:
				return "Choose your plan";
			case ONBOARDING_STEPS.COMPLETION:
				return "You're all set!";
			default:
				return "Getting started";
		}
	};

	const getStepDescription = () => {
		switch (currentStep) {
			case ONBOARDING_STEPS.WELCOME:
				return "Let's get you set up for success with AI-powered learning";
			case ONBOARDING_STEPS.PROFILE:
				return "Help us personalize your experience";
			case ONBOARDING_STEPS.STUDY_GOALS:
				return "We'll tailor content to match your objectives";
			case ONBOARDING_STEPS.PREFERENCES:
				return "Customize how StudyLoop works for you";
			case ONBOARDING_STEPS.PLAN_SELECTION:
				return "Unlock advanced features with a plan (optional)";
			case ONBOARDING_STEPS.COMPLETION:
				return "Welcome to your personalized learning journey";
			default:
				return "";
		}
	};

	const canGoBack = currentStep > 1;
	const canSkipStep =
		currentStep !== ONBOARDING_STEPS.WELCOME && currentStep !== ONBOARDING_STEPS.COMPLETION;
	const isLastStep = currentStep === totalSteps;

	return (
		<Dialog open={isVisible} onOpenChange={handleClose}>
			<DialogContent
				className={cn(
					"max-w-2xl w-full max-h-[90vh] overflow-hidden",
					"border-0 shadow-2xl",
					"bg-gradient-to-br from-background via-background to-primary/5"
				)}
			>
				{/* Custom header with progress and close button */}
				<div className="flex items-center justify-between p-6 pb-0">
					<div className="flex-1">
						<div className="flex items-center gap-4 mb-3">
							<div className="text-sm text-muted-foreground">
								Step {currentStep} of {totalSteps}
							</div>
							<div className="flex-1">
								<Progress value={progressPercentage} className="h-2" />
							</div>
						</div>
					</div>
					<Button variant="ghost" size="sm" onClick={handleClose} className="shrink-0 ml-4">
						<X className="h-4 w-4" />
					</Button>
				</div>

				<DialogHeader className="px-6 pb-2">
					<DialogTitle className="text-2xl font-bold">{getStepTitle()}</DialogTitle>
					<DialogDescription className="text-base text-muted-foreground">
						{getStepDescription()}
					</DialogDescription>
				</DialogHeader>

				{/* Step content with smooth animations */}
				<div className="px-6 py-4 flex-1 overflow-y-auto">
					<AnimatePresence mode="wait">
						<motion.div
							key={currentStep}
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.3, ease: "easeInOut" }}
							className="min-h-[300px]"
						>
							{getStepContent()}
						</motion.div>
					</AnimatePresence>
				</div>

				{/* Footer with navigation */}
				<div className="px-6 py-4 border-t bg-muted/20">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{canGoBack && (
								<Button
									variant="ghost"
									size="sm"
									onClick={previousStep}
									className="text-muted-foreground hover:text-foreground"
								>
									<ArrowLeft className="h-4 w-4 mr-1" />
									Back
								</Button>
							)}
						</div>

						<div className="flex items-center gap-3">
							{canSkipStep && (
								<Button
									variant="ghost"
									size="sm"
									onClick={handleSkip}
									className="text-muted-foreground hover:text-foreground"
								>
									<SkipForward className="h-4 w-4 mr-1" />
									Skip
								</Button>
							)}

							<Button onClick={handleNext} className="min-w-[100px]">
								{isLastStep ? (
									"Get Started"
								) : (
									<>
										Next
										<ArrowRight className="h-4 w-4 ml-1" />
									</>
								)}
							</Button>
						</div>
					</div>

					{/* Skip all option */}
					{currentStep < totalSteps - 1 && (
						<div className="text-center mt-3">
							<Button
								variant="link"
								size="sm"
								onClick={() => {
									skipAllRemaining();
									hideOnboarding();
								}}
								className="text-xs text-muted-foreground hover:text-foreground"
							>
								Skip setup and start using StudyLoop
							</Button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
