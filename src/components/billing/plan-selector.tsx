"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PLANS } from "@/lib/config/plans";
import type { Plan, PlanId } from "@/lib/database/types";
import { PLAN_IDS } from "@/lib/database/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Crown, Star, Zap } from "lucide-react";
import { useState } from "react";

const PLAN_ICONS = {
	[PLAN_IDS.FREE]: { icon: Star, color: "text-muted-foreground" },
	[PLAN_IDS.MONTHLY]: { icon: Zap, color: "text-blue-500" },
	[PLAN_IDS.YEARLY]: { icon: Crown, color: "text-purple-500" },
} as const;

const ANIMATION_VARIANTS = {
	container: {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: 0.1, delayChildren: 0.2 },
		},
	},
	item: {
		hidden: { y: 20, opacity: 0 },
		visible: { y: 0, opacity: 1 },
	},
} as const;

type BillingCycle = "monthly" | "yearly";

interface PlanSelectorProps {
	onPlanSelect: (planId: PlanId) => void;
	currentUserPlan?: PlanId;
	isLoading?: boolean;
	context?: "onboarding" | "account";
}

namespace PlanLogic {
	export function filterPlansForDisplay(billingCycle: BillingCycle): Plan[] {
		return PLANS.filter((plan) => {
			if (plan.id === PLAN_IDS.FREE) return true;
			return plan.id === billingCycle;
		});
	}

	export function isSelected(
		planId: PlanId,
		selectedPlanId: PlanId | undefined,
		currentUserPlan: PlanId | undefined
	): boolean {
		return selectedPlanId === planId || currentUserPlan === planId;
	}

	export function isPopular(planId: PlanId): boolean {
		return planId === PLAN_IDS.YEARLY;
	}

	export function isDowngradeToFree(
		planId: PlanId,
		currentUserPlan: PlanId | undefined
	): boolean {
		return (
			planId === PLAN_IDS.FREE &&
			currentUserPlan !== undefined &&
			currentUserPlan !== PLAN_IDS.FREE
		);
	}

	export function hasNoSubscription(
		currentUserPlan: PlanId | undefined
	): boolean {
		return currentUserPlan === undefined || currentUserPlan === PLAN_IDS.FREE;
	}
}

namespace ButtonStyleLogic {
	export function getButtonStyle(
		isSelected: boolean,
		planId: PlanId,
		currentUserPlan: PlanId | undefined
	): string {
		if (isSelected) {
			return "bg-muted text-muted-foreground";
		}

		if (PlanLogic.isDowngradeToFree(planId, currentUserPlan)) {
			return "bg-destructive/10 text-destructive border-destructive";
		}

		return "bg-primary text-primary-foreground";
	}

	export function getButtonText(
		isLoading: boolean,
		isSelected: boolean,
		planId: PlanId,
		planName: string,
		currentUserPlan: PlanId | undefined,
		context: "onboarding" | "account"
	): string {
		if (isLoading && isSelected) {
			return "Processing...";
		}

		if (isSelected) {
			return "Current Plan";
		}

		// Onboarding context - encourage getting started
		if (context === "onboarding") {
			return planId === PLAN_IDS.FREE
				? "Get Started with Free"
				: `Get Started with ${planName}`;
		}

		// Account context - handle existing subscriptions
		if (planId === PLAN_IDS.FREE) {
			return currentUserPlan === PLAN_IDS.FREE
				? "Current Plan"
				: "Get Started with Free";
		}

		// Paid plans - different CTA based on current status
		return PlanLogic.hasNoSubscription(currentUserPlan)
			? `Get Started with ${planName}`
			: `Switch to ${planName}`;
	}
}

function LoadingSkeleton() {
	return (
		<Card className="flex flex-col h-full">
			<CardHeader className="text-center pt-8">
				<Skeleton className="mx-auto w-12 h-12 rounded-full mb-4" />
				<Skeleton className="h-8 w-32 mx-auto mb-2" />
				<Skeleton className="h-4 w-48 mx-auto" />
			</CardHeader>
			<CardContent className="flex flex-col flex-grow p-6">
				<div className="text-center mb-6">
					<Skeleton className="h-12 w-24 mx-auto mb-2" />
					<Skeleton className="h-4 w-16 mx-auto" />
				</div>
				<div className="space-y-3 flex-grow">
					<div className="flex items-start gap-3">
						<Skeleton className="h-5 w-5 rounded-full mt-0.5" />
						<Skeleton className="h-4 flex-1" />
					</div>
					<div className="flex items-start gap-3">
						<Skeleton className="h-5 w-5 rounded-full mt-0.5" />
						<Skeleton className="h-4 flex-1" />
					</div>
					<div className="flex items-start gap-3">
						<Skeleton className="h-5 w-5 rounded-full mt-0.5" />
						<Skeleton className="h-4 flex-1" />
					</div>
					<div className="flex items-start gap-3">
						<Skeleton className="h-5 w-5 rounded-full mt-0.5" />
						<Skeleton className="h-4 flex-1" />
					</div>
				</div>
				<div className="mt-8">
					<Skeleton className="h-12 w-full" />
				</div>
			</CardContent>
		</Card>
	);
}

function BillingCycleToggle({
	billingCycle,
	onBillingCycleChange,
}: {
	billingCycle: BillingCycle;
	onBillingCycleChange: (cycle: BillingCycle) => void;
}) {
	// Calculate annual savings dynamically
	const monthlyPlan = PLANS.find((p) => p.id === PLAN_IDS.MONTHLY);
	const yearlyPlan = PLANS.find((p) => p.id === PLAN_IDS.YEARLY);

	const annualSavings =
		monthlyPlan && yearlyPlan
			? monthlyPlan.price * 12 - yearlyPlan.annualPrice!
			: 0;

	return (
		<div className="flex items-center justify-center gap-4 mb-8">
			<span
				className={cn(
					"font-medium",
					billingCycle === "monthly"
						? "text-foreground"
						: "text-muted-foreground"
				)}
			>
				Monthly
			</span>
			<Switch
				checked={billingCycle === "yearly"}
				onCheckedChange={(checked) =>
					onBillingCycleChange(checked ? "yearly" : "monthly")
				}
				aria-label="Toggle billing cycle"
			/>
			<span
				className={cn(
					"font-medium",
					billingCycle === "yearly"
						? "text-foreground"
						: "text-muted-foreground"
				)}
			>
				Yearly
			</span>
			<Badge variant="secondary" className="bg-purple-100 text-purple-700">
				Save ${annualSavings}/year
			</Badge>
		</div>
	);
}

function PlanCard({
	plan,
	isSelected,
	isPopular,
	isLoading,
	currentUserPlan,
	context,
	onSelect,
}: {
	plan: Plan;
	isSelected: boolean;
	isPopular: boolean;
	isLoading: boolean;
	currentUserPlan: PlanId | undefined;
	context: "onboarding" | "account";
	onSelect: (planId: PlanId) => void;
}) {
	const iconConfig = PLAN_ICONS[plan.id as keyof typeof PLAN_ICONS];
	const IconComponent = iconConfig.icon;

	const buttonStyle = ButtonStyleLogic.getButtonStyle(
		isSelected,
		plan.id,
		currentUserPlan
	);

	const buttonText = ButtonStyleLogic.getButtonText(
		isLoading,
		isSelected,
		plan.id,
		plan.name,
		currentUserPlan,
		context
	);

	return (
		<motion.div
			variants={ANIMATION_VARIANTS.item}
			className={cn("h-full", isPopular && "lg:scale-105")}
		>
			<Card
				className={cn(
					"flex flex-col h-full transition-all duration-300 relative overflow-hidden",
					isSelected
						? "border-primary ring-2 ring-primary"
						: "border-border/50",
					isPopular ? "bg-primary/5" : "bg-background"
				)}
			>
				{/* Popular Plan Badge */}
				{isPopular && (
					<div className="absolute top-0 right-0">
						<div className="w-24 h-24 bg-primary/20 rounded-bl-full flex items-start justify-end p-2">
							<Star className="h-6 w-6 text-primary fill-primary" />
						</div>
					</div>
				)}

				{/* Plan Header */}
				<CardHeader className="text-center pt-8">
					<div
						className={cn(
							"mx-auto w-12 h-12 mb-4 rounded-full flex items-center justify-center",
							iconConfig.color
						)}
					>
						<IconComponent className="w-8 h-8" />
					</div>
					<CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
					<CardDescription className="px-4 min-h-[40px]">
						{plan.description}
					</CardDescription>
				</CardHeader>

				{/* Plan Content */}
				<CardContent className="flex flex-col flex-grow p-6">
					{/* Pricing */}
					<div className="text-center mb-6">
						<div className="mb-2">
							<span className="text-4xl font-extrabold">
								{plan.price === 0 ? "Free" : `$${plan.price}`}
							</span>
							{plan.billingPeriod && (
								<span className="text-lg text-muted-foreground font-medium">
									{plan.billingPeriod}
								</span>
							)}
						</div>

						{/* Annual Pricing Details */}
						{plan.id === PLAN_IDS.YEARLY && plan.annualPrice && (
							<div className="text-sm text-muted-foreground mb-2">
								<span className="block">
									Billed annually at ${plan.annualPrice}
								</span>
							</div>
						)}

						{/* Savings Badge */}
						{plan.savingsInfo && (
							<div className="text-sm text-purple-600 font-semibold bg-purple-50 px-3 py-1 rounded-full inline-block">
								{plan.savingsInfo}
							</div>
						)}
					</div>

					{/* Features List */}
					<ul className="space-y-3 text-sm flex-grow">
						{plan.features.map((feature) => (
							<li key={feature.id} className="flex items-start gap-3">
								<Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
								<span
									className={cn(
										feature.included ? "" : "text-muted-foreground line-through"
									)}
								>
									{feature.name}
								</span>
							</li>
						))}
					</ul>

					{/* Action Button */}
					<div className="mt-8">
						<Button
							onClick={() => onSelect(plan.id)}
							disabled={isLoading || isSelected}
							className={cn("w-full font-bold py-6 text-base", buttonStyle)}
							variant={isSelected ? "secondary" : "default"}
						>
							{buttonText}
						</Button>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}

function PlanGrid({
	plans,
	selectedPlanId,
	currentUserPlan,
	isLoading,
	context,
	onPlanSelect,
}: {
	plans: Plan[];
	selectedPlanId: PlanId | undefined;
	currentUserPlan: PlanId | undefined;
	isLoading: boolean;
	context: "onboarding" | "account";
	onPlanSelect: (planId: PlanId) => void;
}) {
	if (isLoading) {
		return (
			<>
				<motion.div variants={ANIMATION_VARIANTS.item}>
					<LoadingSkeleton />
				</motion.div>
				<motion.div variants={ANIMATION_VARIANTS.item}>
					<LoadingSkeleton />
				</motion.div>
			</>
		);
	}

	return (
		<>
			{plans.map((plan) => {
				const isSelected = PlanLogic.isSelected(
					plan.id,
					selectedPlanId,
					currentUserPlan
				);
				const isPopular = PlanLogic.isPopular(plan.id);

				return (
					<PlanCard
						key={plan.id}
						plan={plan}
						isSelected={isSelected}
						isPopular={isPopular}
						isLoading={isLoading}
						currentUserPlan={currentUserPlan}
						context={context}
						onSelect={onPlanSelect}
					/>
				);
			})}
		</>
	);
}

function HelpText() {
	return (
		<div className="text-center mt-10">
			<p className="text-xs text-muted-foreground">
				All plans include a 14-day money-back guarantee. You can upgrade,
				downgrade, or cancel anytime.
			</p>
		</div>
	);
}

export function PlanSelector({
	onPlanSelect,
	currentUserPlan,
	isLoading = false,
	context = "account",
}: PlanSelectorProps) {
	// State Management
	const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
	const [selectedPlanId, setSelectedPlanId] = useState<PlanId | undefined>(
		undefined
	);

	// Event Handlers
	const handlePlanSelect = (planId: PlanId) => {
		// Prevent re-triggering if same plan is selected
		if (selectedPlanId === planId) {
			return;
		}
		setSelectedPlanId(planId);
		onPlanSelect(planId);
	};

	const handleBillingCycleChange = (cycle: BillingCycle) => {
		setBillingCycle(cycle);
	};

	// Data Processing
	const displayedPlans = PlanLogic.filterPlansForDisplay(billingCycle);

	return (
		<div className="w-full max-w-4xl mx-auto">
			{/* Billing Cycle Toggle */}
			<BillingCycleToggle
				billingCycle={billingCycle}
				onBillingCycleChange={handleBillingCycleChange}
			/>

			{/* Plans Grid */}
			<motion.div
				initial="hidden"
				animate="visible"
				variants={ANIMATION_VARIANTS.container}
				className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
			>
				<PlanGrid
					plans={displayedPlans}
					selectedPlanId={selectedPlanId}
					currentUserPlan={currentUserPlan}
					isLoading={isLoading}
					context={context}
					onPlanSelect={handlePlanSelect}
				/>
			</motion.div>

			{/* Help Text */}
			<HelpText />
		</div>
	);
}
