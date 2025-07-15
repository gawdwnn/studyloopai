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
import { PLANS } from "@/lib/plans/config";
import type { PlanId } from "@/lib/plans/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Crown, Star, Zap } from "lucide-react";
import { useState } from "react";

const PLAN_ICONS = {
  free: { icon: Star, color: "text-muted-foreground" },
  monthly: { icon: Zap, color: "text-blue-500" },
  yearly: { icon: Crown, color: "text-purple-500" },
} as const;

type BillingCycle = "monthly" | "yearly";

interface PlanSelectorProps {
  onPlanSelect: (planId: PlanId) => void;
  currentUserPlan?: PlanId;
  isLoading?: boolean;
}

function PlanSkeleton() {
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
          {[...Array(4)].map((_, i) => (
            <div key={`${i}-${Date.now()}`} className="flex items-start gap-3">
              <Skeleton className="h-5 w-5 rounded-full mt-0.5" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PlanSelector({
  onPlanSelect,
  currentUserPlan,
  isLoading,
}: PlanSelectorProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | undefined>(
    currentUserPlan
  );

  const handlePlanSelect = (planId: PlanId) => {
    setSelectedPlanId(planId);
    onPlanSelect(planId);
  };

  const displayedPlans = PLANS.filter((plan) => {
    if (plan.id === "free") return true;
    return plan.id === billingCycle;
  }).map((plan) => {
    // Adjust the paid plan's name to reflect the billing cycle
    if (plan.id === billingCycle && billingCycle === "yearly") {
      return {
        ...plan,
        name: "Pro Plan",
        description: "Best value for serious students"
      };
    }
    if (plan.id === billingCycle && billingCycle === "monthly") {
      return {
        ...plan,
        name: "Pro Plan",
        description: "Flexible monthly billing"
      };
    }
    return plan;
  });

  const popularPlanId = "yearly";

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Billing Cycle Toggle */}
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
            setBillingCycle(checked ? "yearly" : "monthly")
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
          Save 50%
        </Badge>
      </div>

      {/* Plans Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 },
          },
        }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
      >
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <motion.div
              key={`${i}-${Date.now()}`}
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1 },
              }}
            >
              <PlanSkeleton />
            </motion.div>
          ))
        ) : (
          displayedPlans.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          const isPopular = plan.id === popularPlanId;
          const iconConfig = PLAN_ICONS[plan.id as keyof typeof PLAN_ICONS];
          const IconComponent = iconConfig.icon;

          return (
            <motion.div
              key={plan.id}
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1 },
              }}
              className={cn(
                "h-full",
                isPopular && "lg:scale-105" // Make popular plan stand out
              )}
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
                {isPopular && (
                  <div className="absolute top-0 right-0">
                    <div className="w-24 h-24 bg-primary/20 rounded-bl-full flex items-start justify-end p-2">
                      <Star className="h-6 w-6 text-primary fill-primary" />
                    </div>
                  </div>
                )}

                <CardHeader className="text-center pt-8">
                  <div
                    className={cn(
                      "mx-auto w-12 h-12 mb-4 rounded-full flex items-center justify-center",
                      iconConfig.color
                    )}
                  >
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-2xl font-bold">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="px-4 min-h-[40px]">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col flex-grow p-6">
                  <div className="text-center mb-6">
                    <span className="text-4xl font-extrabold">
                      {plan.price === 0 ? "Free" : `$${plan.price}`}
                    </span>
                    {plan.billingPeriod && (
                      <span className="text-lg text-muted-foreground font-medium">
                        {plan.billingPeriod}
                      </span>
                    )}
                    {plan.savingsInfo && billingCycle === "yearly" && (
                      <p className="text-sm text-purple-600 font-semibold mt-1">
                        {plan.savingsInfo}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 text-sm flex-grow">
                    {plan.features.map((feature) => (
                      <li key={feature.id} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <span
                          className={cn(
                            feature.included
                              ? ""
                              : "text-muted-foreground line-through"
                          )}
                        >
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Button
                      onClick={() => handlePlanSelect(plan.id)}
                      disabled={isLoading || isSelected}
                      className={cn(
                        "w-full font-bold py-6 text-base",
                        isSelected
                          ? "bg-muted text-muted-foreground"
                          : plan.id === "free" && currentUserPlan !== "free"
                            ? "bg-destructive/10 text-destructive border-destructive"
                            : "bg-primary text-primary-foreground"
                      )}
                      variant={isSelected ? "secondary" : "default"}
                    >
                      {isLoading && isSelected
                        ? "Processing..."
                        : isSelected
                          ? "Current Plan"
                          : plan.id === "free" && currentUserPlan !== "free"
                            ? "Downgrade"
                            : currentUserPlan === "free"
                              ? "Upgrade"
                              : "Switch Plan"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
          })
        )}
      </motion.div>

      {/* Help Text */}
      <div className="text-center mt-10">
        <p className="text-xs text-muted-foreground">
          All plans include a 14-day money-back guarantee. You can upgrade,
          downgrade, or cancel anytime.
        </p>
      </div>
    </div>
  );
}
