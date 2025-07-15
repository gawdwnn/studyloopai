"use client";

import { PlanSelector } from "@/components/billing/plan-selector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/plans/config";
import type { PlanId } from "@/lib/plans/types";
import { useState } from "react";

export function AccountBillingSettings() {
  const [isLoading, setIsLoading] = useState(false);
  // This would come from user data
  const [currentUserPlan, setCurrentUserPlan] = useState<PlanId>("free");

  const handlePlanSelection = async (planId: PlanId) => {
    setIsLoading(true);
    // Here you would call a server action to update the user's plan
    // For now, we'll just simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setCurrentUserPlan(planId);
    setIsLoading(false);
  };

  const currentPlan = PLANS.find(plan => plan.id === currentUserPlan);
  const currentPlanName = currentPlan?.name || "Unknown Plan";
  const currentPlanPrice = currentPlan?.price || 0;
  const currentPlanBilling = currentPlan?.billingPeriod || "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Subscription</CardTitle>
        <CardDescription className="space-y-2">
          <div className="flex items-center gap-2">
            You are currently on the{" "}
            <Badge variant="secondary" className="font-semibold">
              {currentPlanName}
            </Badge>
            plan.
          </div>
          {currentPlanPrice > 0 && (
            <div className="text-sm text-muted-foreground">
              ${currentPlanPrice}{currentPlanBilling} • Next billing: January 15, 2025
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PlanSelector
          onPlanSelect={handlePlanSelection}
          currentUserPlan={currentUserPlan}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
