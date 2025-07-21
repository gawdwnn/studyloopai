"use client";

import { CompletionStep } from "@/components/onboarding/steps/completion-step";
import { PersonalizationStep } from "@/components/onboarding/steps/personalization-step";
import { WelcomeProfileStep } from "@/components/onboarding/steps/welcome-profile-step";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ONBOARDING_STEPS,
	useOnboardingStore,
} from "@/stores/onboarding-store";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

const stepComponents: Record<string, React.ComponentType> = {
	"welcome-profile": WelcomeProfileStep,
	personalization: PersonalizationStep,
	completion: CompletionStep,
};

const stepSlugs = Object.keys(stepComponents);
const stepMap: { [key: string]: number } = {
	"welcome-profile": ONBOARDING_STEPS.WELCOME_PROFILE,
	personalization: ONBOARDING_STEPS.PERSONALIZATION,
	completion: ONBOARDING_STEPS.COMPLETION,
};

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
	const goToStep = useOnboardingStore((state) => state.goToStep);

	const stepSlug = Array.isArray(params.step) ? params.step[0] : params.step;
	const StepComponent = stepSlug ? stepComponents[stepSlug] : null;

	useEffect(() => {
		if (stepSlug && stepMap[stepSlug]) {
			goToStep(stepMap[stepSlug]);
		} else {
			// Redirect to the first step if the slug is invalid
			router.replace(`/onboarding/${stepSlugs[0]}`);
		}
	}, [stepSlug, goToStep, router]);

	if (!StepComponent) {
		return <OnboardingStepSkeleton />;
	}

	return <StepComponent />;
}
