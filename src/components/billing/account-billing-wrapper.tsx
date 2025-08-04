import { getUserPlan } from "@/lib/actions/plans";
import type { PlanId } from "@/lib/database/types";
import { getServerClient } from "@/lib/supabase/server";
import { AccountBillingSettings } from "./account-billing-settings";

export async function AccountBillingWrapper() {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return null;
	}

	// Get the user's current plan
	let currentPlan = null;
	try {
		currentPlan = await getUserPlan();
	} catch (_error) {
		// User might not have a plan yet, will be undefined
	}

	const planId: PlanId | undefined = currentPlan?.planId;
	const currentPeriodEnd = currentPlan?.currentPeriodEnd?.toISOString() || null;

	return (
		<AccountBillingSettings
			initialPlanId={planId}
			currentPeriodEnd={currentPeriodEnd}
			userId={user.id}
		/>
	);
}
