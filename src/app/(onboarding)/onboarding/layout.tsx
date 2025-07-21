"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
	completeOnboarding as completeOnboardingAction,
	skipOnboarding,
} from "@/lib/actions/user";
import {
	TOTAL_STEPS,
	useOnboardingProgress,
	useOnboardingStore,
} from "@/stores/onboarding-store";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

export default function OnboardingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const [isPending, startTransition] = useTransition();

	const currentStep = useOnboardingStore((state) => state.currentStep);
	const completeOnboarding = useOnboardingStore(
		(state) => state.completeOnboarding
	);
	const getStepInfo = useOnboardingStore((state) => state.getStepInfo);

	const progress = useOnboardingProgress();
	const { title } = getStepInfo(currentStep);

	const handleNext = () => {
		if (currentStep === TOTAL_STEPS) {
			startTransition(async () => {
				await completeOnboardingAction();
				completeOnboarding();
				router.push("/dashboard");
			});
		} else {
			const nextSlug = getStepInfo(currentStep + 1).slug;
			router.push(`/onboarding/${nextSlug}`);
		}
	};

	const handleBack = () => {
		if (currentStep > 1) {
			const prevSlug = getStepInfo(currentStep - 1).slug;
			router.push(`/onboarding/${prevSlug}`);
		}
	};

	const handleSkip = () => {
		startTransition(async () => {
			await skipOnboarding();
			router.push("/dashboard");
		});
	};

	const isLastStep = currentStep === TOTAL_STEPS;
	const canGoBack = currentStep > 1;

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
							onClick={handleSkip}
							disabled={isPending}
							className="border-2 hover:bg-accent font-medium"
						>
							{isPending ? "Skipping..." : "Skip for now →"}
						</Button>
					</div>
				</div>
				<Progress value={progress} className="h-1" />
			</header>

			{/* Main Content */}
			<main className="flex-1 flex flex-col items-center justify-center pt-16">
				<div className="w-full max-w-2xl px-4 py-16">
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
							{children}
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
						<div className="flex items-center gap-4">
							<Button onClick={handleNext} disabled={isPending}>
								{isLastStep ? (isPending ? "Finishing..." : "Finish") : "Next"}
								{!isLastStep && <ArrowRight className="h-4 w-4 ml-2" />}
							</Button>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
