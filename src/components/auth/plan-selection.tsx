"use client";

import { LoadingButton } from "@/components/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/use-media-query";
import { PLANS } from "@/lib/plans/config";
import type { PlanId } from "@/lib/plans/types";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { useState } from "react";

export function PlanSelection({
  onComplete,
  loading = false,
}: {
  onComplete: (plan: PlanId) => void;
  loading?: boolean;
}) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("free");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleContinue = (planId: PlanId) => {
    setSelectedPlan(planId);
    onComplete(planId);
  };

  return (
    <div className="w-full space-y-6 md:space-y-8 mt-14">
      {/* Plans grid - Responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 w-full">
        {PLANS.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ y: 50, opacity: 0 }}
            animate={
              isDesktop
                ? {
                    y: plan.isPopular ? -20 : 0,
                    opacity: 1,
                    x: 0,
                    scale: plan.isPopular ? 1.02 : 1.0,
                  }
                : { y: 0, opacity: 1 }
            }
            transition={{
              duration: 0.6,
              type: "spring",
              stiffness: 100,
              damping: 20,
              delay: index * 0.1,
            }}
            className="relative w-full"
          >
            <Card
              className={cn(
                "border-2 transition-all hover:shadow-lg cursor-pointer h-full w-full",
                "min-h-[400px] md:min-h-[450px] lg:min-h-[500px]",
                selectedPlan === plan.id
                  ? "border-primary shadow-lg"
                  : plan.isPopular
                  ? "border-primary/50"
                  : "border-border hover:border-primary/30"
              )}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.isPopular && (
                <div className="absolute -top-2 md:-top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-2 md:px-3 py-1 flex items-center gap-1 text-xs">
                    <Star className="h-3 w-3 fill-current" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardContent className="p-4 md:p-6 lg:p-8 text-center h-full flex flex-col">
                <div className="space-y-4 md:space-y-6 flex-grow">
                  <h3 className="font-semibold text-lg md:text-xl lg:text-2xl">
                    {plan.name}
                  </h3>

                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center justify-center gap-1">
                      {plan.price === 0 ? (
                        <span className="text-3xl md:text-4xl lg:text-5xl font-bold">
                          Free
                        </span>
                      ) : (
                        <>
                          <span className="text-sm md:text-base lg:text-lg text-muted-foreground">
                            $
                          </span>
                          <NumberFlow
                            value={plan.price}
                            format={{
                              style: "decimal",
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }}
                            transformTiming={{
                              duration: 500,
                              easing: "ease-out",
                            }}
                            className="text-3xl md:text-4xl lg:text-5xl font-bold tabular-nums"
                          />
                          <span className="text-sm md:text-base lg:text-lg text-muted-foreground">
                            {plan.billingPeriod}
                          </span>
                        </>
                      )}
                    </div>

                    {plan.description && (
                      <div className="text-xs md:text-sm text-muted-foreground">
                        {plan.description}
                      </div>
                    )}

                    {plan.savingsInfo && (
                      <div className="text-xs md:text-sm text-green-600 font-medium">
                        {plan.savingsInfo}
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 md:space-y-4 text-left">
                    {plan.features.map((feature) => (
                      <li
                        key={`${plan.id}-${feature.id}`}
                        className="flex items-start gap-2 md:gap-3"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex-shrink-0",
                            feature.included
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {feature.included ? (
                            <Check className="h-4 w-4 md:h-5 md:w-5" />
                          ) : (
                            <span className="text-lg md:text-xl leading-none">
                              ×
                            </span>
                          )}
                        </span>
                        <span className="text-sm md:text-base">
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 md:mt-8">
                  <LoadingButton
                    variant={selectedPlan === plan.id ? "default" : "outline"}
                    className={cn(
                      "w-full h-10 md:h-11 lg:h-12 text-sm md:text-base lg:text-lg font-semibold transition-all duration-300",
                      plan.isPopular &&
                        selectedPlan !== plan.id &&
                        "border-primary/50 hover:bg-primary hover:text-primary-foreground",
                      selectedPlan === plan.id &&
                        "bg-primary text-primary-foreground"
                    )}
                    onClick={() => handleContinue(plan.id)}
                    loading={loading && selectedPlan === plan.id}
                  >
                    {plan.price === 0
                      ? "Get started for free"
                      : selectedPlan === plan.id
                      ? "Get started"
                      : "Select plan"}
                  </LoadingButton>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
