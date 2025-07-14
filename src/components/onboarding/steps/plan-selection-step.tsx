"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS } from "@/lib/plans/config";
import type { PlanId } from "@/lib/plans/types";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Star, Zap } from "lucide-react";
import { useState } from "react";

// Plan icon mapping for visual presentation
const PLAN_ICONS = {
	free: { icon: Star, color: "text-gray-500", bgColor: "bg-gray-50" },
	monthly: { icon: Zap, color: "text-blue-500", bgColor: "bg-blue-50" },
	yearly: { icon: Crown, color: "text-purple-500", bgColor: "bg-purple-50" },
} as const;

export function PlanSelectionStep() {
	const { planSelection, selectPlan, skipPlanSelection, markStepCompleted } = useOnboardingStore();

	const [selectedPlan, setSelectedPlan] = useState<PlanId | undefined>(planSelection.selectedPlan);

	const handlePlanSelect = (planId: PlanId) => {
		setSelectedPlan(planId);
		selectPlan(planId);
	};

	const handleConfirmPlan = () => {
		if (selectedPlan) {
			selectPlan(selectedPlan);
		}
		markStepCompleted(5); // Plan selection step
	};

	const handleSkipPlan = () => {
		skipPlanSelection();
		markStepCompleted(5); // Plan selection step
	};

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
			{/* Header */}
			<motion.div variants={itemVariants} className="text-center space-y-2">
				<div className="mx-auto w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center">
					<Sparkles className="h-6 w-6 text-white" />
				</div>
				<p className="text-sm text-muted-foreground">
					Choose a plan that fits your learning needs. You can upgrade or downgrade anytime.
				</p>
			</motion.div>

			{/* Plans grid */}
			<motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{PLANS.map((plan, index) => {
					const isSelected = selectedPlan === plan.id;
					const iconConfig = PLAN_ICONS[plan.id as keyof typeof PLAN_ICONS];
					const IconComponent = iconConfig.icon;

					return (
						<motion.div
							key={plan.id}
							variants={itemVariants}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
						>
							<Card
								className={cn(
									"cursor-pointer transition-all duration-200 relative h-full",
									isSelected
										? "ring-2 ring-primary shadow-lg"
										: "hover:shadow-md hover:bg-muted/20",
									plan.isPopular && "border-primary"
								)}
								onClick={() => handlePlanSelect(plan.id)}
							>
								{plan.isPopular && (
									<div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
										<Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
									</div>
								)}

								<CardHeader className={cn("text-center pb-2", iconConfig.bgColor)}>
									<div className={cn("mx-auto w-8 h-8 mb-2", iconConfig.color)}>
										<IconComponent className="w-full h-full" />
									</div>
									<CardTitle className="text-lg">{plan.name}</CardTitle>
									<div className="space-y-1">
										<div className="text-2xl font-bold">
											{plan.price === 0 ? "Free" : `$${plan.price}`}
											{plan.billingPeriod && (
												<span className="text-sm font-normal text-muted-foreground ml-1">
													{plan.billingPeriod}
												</span>
											)}
										</div>
										{plan.savingsInfo && (
											<div className="text-xs text-green-600 font-medium">
												{plan.savingsInfo}
											</div>
										)}
									</div>
								</CardHeader>

								<CardContent className="space-y-4">
									<CardDescription className="text-center text-sm">
										{plan.description}
									</CardDescription>

									<ul className="space-y-2">
										{plan.features.map((feature) => (
											<li key={feature.id} className="flex items-start gap-2 text-sm">
												{feature.included ? (
													<Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
												) : (
													<span className="text-lg text-muted-foreground leading-none mt-0.5">×</span>
												)}
												<span className={feature.included ? "" : "text-muted-foreground"}>
													{feature.name}
												</span>
											</li>
										))}
									</ul>

									{isSelected && (
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											className="text-center"
										>
											<Badge variant="secondary" className="gap-1">
												<Check className="h-3 w-3" />
												Selected
											</Badge>
										</motion.div>
									)}
								</CardContent>
							</Card>
						</motion.div>
					);
				})}
			</motion.div>

			{/* Action buttons */}
			<motion.div
				variants={itemVariants}
				className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4"
			>
				{selectedPlan && (
					<Button onClick={handleConfirmPlan} className="min-w-[120px]">
						Choose {PLANS.find((p) => p.id === selectedPlan)?.name}
					</Button>
				)}
				<Button
					variant="ghost"
					onClick={handleSkipPlan}
					className="text-muted-foreground hover:text-foreground"
				>
					Continue with Free Plan
				</Button>
			</motion.div>

			{/* Help text */}
			<motion.div variants={itemVariants} className="text-center space-y-2">
				<p className="text-xs text-muted-foreground">
					💡 You can start with the free plan and upgrade anytime as your needs grow
				</p>
				<p className="text-xs text-muted-foreground">
					All plans include a 14-day money-back guarantee
				</p>
			</motion.div>
		</motion.div>
	);
}
