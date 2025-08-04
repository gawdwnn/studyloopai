"use client";

import { PlanSelector } from "@/components/billing/plan-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getCustomerPortalUrl } from "@/lib/actions/plans";
import { selectPlan } from "@/lib/actions/plans";
import { PLANS } from "@/lib/config/plans";
import type { PlanId } from "@/lib/database/types";
import { PLAN_IDS } from "@/lib/database/types";
import { createLogger } from "@/lib/utils/logger";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const logger = createLogger("billing:account-settings");

interface AccountBillingSettingsProps {
	initialPlanId: PlanId | undefined;
	currentPeriodEnd?: string | null;
	userId?: string;
}

export function AccountBillingSettings({
	initialPlanId,
	currentPeriodEnd,
	userId,
}: AccountBillingSettingsProps) {
	const [loadingPortal, setLoadingPortal] = useState(false);

	const [isLoading, setIsLoading] = useState(false);

	const handlePlanSelection = async (planId: PlanId) => {
		setIsLoading(true);
		try {
			const result = await selectPlan(planId, "account");

			if (result.success) {
				if (result.checkoutUrl) {
					// Redirect to Polar checkout for paid plans
					window.location.href = result.checkoutUrl;
				} else {
					// Free plan selected successfully
					toast.success("Plan updated successfully!");
					// Refresh the page to show updated plan
					window.location.reload();
				}
			} else {
				toast.error(result.error || "Failed to update plan");
			}
		} catch (_error) {
			toast.error("Failed to update plan. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleManageSubscription = async () => {
		setLoadingPortal(true);
		try {
			const portalUrl = await getCustomerPortalUrl();
			if (portalUrl) {
				window.open(portalUrl, "_blank");
			}
		} catch (error) {
			logger.error("Failed to get customer portal URL", {
				error:
					error instanceof Error
						? {
								message: error.message,
								name: error.name,
							}
						: error,
				userId,
			});

			toast.error("Failed to open customer portal", {
				description:
					"Please try again or contact support if the issue persists.",
			});
		} finally {
			setLoadingPortal(false);
		}
	};

	const currentPlan = PLANS.find((plan) => plan.id === initialPlanId);
	const currentPlanName = currentPlan?.name || "No Plan";
	const currentPlanPrice = currentPlan?.price || 0;
	const currentPlanBilling = currentPlan?.billingPeriod || "";

	// Format next billing date
	const nextBillingDate = currentPeriodEnd
		? new Date(currentPeriodEnd).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Your Subscription</CardTitle>
				<CardDescription className="space-y-2">
					<div className="flex items-center gap-2">
						You are currently on the{" "}
						<Badge variant="secondary" className="font-semibold">
							{currentPlanName}
						</Badge>
						plan.
					</div>
					{currentPlanPrice > 0 && nextBillingDate && (
						<div className="text-sm text-muted-foreground">
							${currentPlanPrice}
							{currentPlanBilling} • Next billing: {nextBillingDate}
						</div>
					)}
					<div className="text-sm text-muted-foreground pt-2">
						{!initialPlanId || initialPlanId === PLAN_IDS.FREE
							? "Select a plan below to upgrade your account"
							: "Select a different plan below to change your subscription"}
					</div>
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Show manage subscription button for paid plans */}
				{initialPlanId && initialPlanId !== PLAN_IDS.FREE && (
					<div className="flex justify-end">
						<Button
							variant="outline"
							onClick={handleManageSubscription}
							disabled={loadingPortal}
							className="gap-2"
						>
							{loadingPortal ? (
								"Loading..."
							) : (
								<>
									Manage Subscription
									<ExternalLink className="h-4 w-4" />
								</>
							)}
						</Button>
					</div>
				)}

				<PlanSelector
					onPlanSelect={handlePlanSelection}
					currentUserPlan={initialPlanId}
					isLoading={isLoading}
				/>
			</CardContent>
		</Card>
	);
}
