import { createUserPlan } from "@/lib/actions/plans";
import type { PlanId } from "@/lib/plans/types";
import { getServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const supabase = await getServerClient();

	const requestUrl = new URL(req.url);
	const code = requestUrl.searchParams.get("code");
	const next = requestUrl.searchParams.get("next") || "/dashboard";

	if (code) {
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);

		if (error) {
			// If there's an error during code exchange, redirect to the sign-in page with an error message.
			return NextResponse.redirect(
				`${requestUrl.origin}/auth/signin?error=auth_error&error_description=${encodeURIComponent(
					error.message
				)}`
			);
		}

		// Check if this is an email verification callback with a selected plan
		if (data.user?.user_metadata?.selected_plan) {
			try {
				const selectedPlan = data.user.user_metadata.selected_plan as PlanId;

				// Validate the plan before proceeding
				if (!selectedPlan || typeof selectedPlan !== "string") {
					console.error("Auth callback: Invalid plan in user metadata:", selectedPlan);
					return NextResponse.redirect(
						`${requestUrl.origin}/auth/signup?step=plan&error=invalid_plan`
					);
				}

				// Complete the signup by creating the user plan
				await createUserPlan(selectedPlan, data.user.id);

				// Plan created successfully, user signup is now complete
				// Middleware will handle the rest of the flow
			} catch (error) {
				// Log the specific error for debugging
				console.error("Auth callback: Failed to create user plan:", error);

				// Redirect to plan selection with error message
				// This ensures the user can retry plan creation
				return NextResponse.redirect(
					`${requestUrl.origin}/auth/signup?step=plan&error=plan_creation_failed&error_description=${encodeURIComponent(
						"Failed to create subscription plan. Please try again."
					)}`
				);
			}
		}
	}

	// On successful authentication, redirect to the intended destination
	// The database trigger automatically creates the user record with signup_step = 1
	// The middleware will handle redirecting to plan selection if needed
	return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
