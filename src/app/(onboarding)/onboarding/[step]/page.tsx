"use client";

import { BillingStep } from "@/components/onboarding/steps/billing-step";
import { CompletionStep } from "@/components/onboarding/steps/completion-step";
import { PersonalizationStep } from "@/components/onboarding/steps/personalization-step";
import { WelcomeProfileStep } from "@/components/onboarding/steps/welcome-profile-step";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useRouter } from "next/navigation";

const stepComponents: Record<string, React.ComponentType> = {
	"welcome-profile": WelcomeProfileStep,
	personalization: PersonalizationStep,
	billing: BillingStep,
	completion: CompletionStep,
};

const stepSlugs = Object.keys(stepComponents);

function OnboardingStepSkeleton() {
	return (
		<div className="space-y-8">
			<div className="space-y-4">
				<Skeleton className="h-6 w-1/3" />
				<Skeleton className="h-12 w-full" />
			</div>
			<div className="space-y-4">
				<Skeleton className="h-6 w-1/3" />
				<Skeleton className="h-12 w-full" />
			</div>
			<div className="space-y-4">
				<Skeleton className="h-6 w-1/4" />
				<div className="grid grid-cols-2 gap-4">
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			</div>
		</div>
	);
}

export default function OnboardingStepPage() {
	const router = useRouter();
	const params = useParams();

	const stepSlug = Array.isArray(params.step) ? params.step[0] : params.step;
	const StepComponent = stepSlug ? stepComponents[stepSlug] : null;

	// If the step is invalid, redirect to the first step
	if (stepSlug && !stepComponents[stepSlug]) {
		router.replace(`/onboarding/${stepSlugs[0]}`);
		return <OnboardingStepSkeleton />;
	}

	if (!StepComponent) {
		return <OnboardingStepSkeleton />;
	}

	return <StepComponent />;
}
