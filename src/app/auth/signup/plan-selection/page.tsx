"use client";

import { PlanSelection } from "@/components/auth/plan-selection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { createUserPlan } from "@/lib/actions/plans";
import type { PlanId } from "@/lib/plans/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function PlanSelectionPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { getUser } = useAuth();

  const handlePlanSelection = async (plan: PlanId) => {
    setError(null);

    const { user } = await getUser();
    if (!user) {
      setError("You must be logged in to select a plan.");
      return;
    }

    startTransition(async () => {
      try {
        await createUserPlan(plan, user.id);
        router.push("/dashboard");
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("An unexpected error occurred during plan selection.");
        }
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-full rounded-xl p-4 sm:p-6">
      <div className="text-center mb-6 lg:mb-8">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2">
          Pick your plan
        </h1>
        <p className="text-xs md:text-sm lg:text-base text-muted-foreground">
          Choose a plan that fits your learning style.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PlanSelection onComplete={handlePlanSelection} loading={isPending} />
    </div>
  );
}
