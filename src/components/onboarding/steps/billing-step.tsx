"use client";
import { PlanSelector } from "@/components/billing/plan-selector";
import { useBillingStepData } from "@/hooks/use-onboarding";
import { selectPlan } from "@/lib/actions/plans";
import { updateOnboardingStep } from "@/lib/actions/user";
import type { PlanId } from "@/lib/database/types";
import { motion } from "framer-motion";
import { Crown, Shield, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function BillingStep() {
	const router = useRouter();
	const {
		selectedPlan: savedPlan,
		currentUserPlan,
		isLoading: dataLoading,
	} = useBillingStepData();
	const [selectedPlan, setSelectedPlan] = useState<PlanId | undefined>();
	const [isLoading, setIsLoading] = useState(false);

	// Initialize selectedPlan from saved data when hook loads
	useEffect(() => {
		if (!dataLoading && savedPlan) {
			setSelectedPlan(savedPlan as PlanId);
		}
	}, [savedPlan, dataLoading]);

	const handlePlanSelection = useCallback(
		async (planId: PlanId) => {
			// Prevent re-triggering if same plan is selected
			if (selectedPlan === planId) {
				return;
			}

			// Update local state
			setSelectedPlan(planId);

			// Save plan selection to onboarding data first
			await updateOnboardingStep(4, {
				selectedPlan: planId,
			});

			// Use unified plan selection handler
			setIsLoading(true);
			try {
				const result = await selectPlan(planId, "onboarding");

				if (result.success) {
					if (result.checkoutUrl) {
						// Redirect to Polar checkout for paid plans
						window.location.href = result.checkoutUrl;
					} else {
						// Free plan selected successfully, continue to completion
						router.push("/onboarding/completion");
					}
				} else {
					toast.error(result.error || "Failed to select plan");
				}
			} catch (_error) {
				toast.error("Failed to select plan. Please try again.");
			} finally {
				setIsLoading(false);
			}
		},
		[selectedPlan, router]
	);

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
			},
		},
	};

	const itemVariants = {
		hidden: { y: 20, opacity: 0 },
		visible: {
			y: 0,
			opacity: 1,
			transition: { duration: 0.3 },
		},
	};

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			className="space-y-6"
		>
			{/* Plan Selector */}
			<div>
				<PlanSelector
					onPlanSelect={handlePlanSelection}
					currentUserPlan={currentUserPlan}
					isLoading={isLoading || dataLoading}
					context="onboarding"
				/>
			</div>

			{/* Trust indicators */}
			<motion.div variants={itemVariants} className="text-center">
				<div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
					<div className="flex items-center gap-1">
						<Shield className="h-3 w-3" />
						<span>Secure</span>
					</div>
					<div className="flex items-center gap-1">
						<Crown className="h-3 w-3" />
						<span>No commitment</span>
					</div>
					<div className="flex items-center gap-1">
						<Star className="h-3 w-3" />
						<span>Cancel anytime</span>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}
