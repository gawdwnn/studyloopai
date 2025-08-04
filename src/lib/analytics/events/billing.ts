/**
 * Billing & Payment Analytics Events
 * Server-side only events for tracking billing lifecycle and revenue
 */

import { setUserProperties, trackServerEvent } from "../posthog";

export const billingEvents = {
	checkoutStarted: async (
		planId: string,
		planPrice?: number,
		currency = "USD",
		userId?: string
	) => {
		await trackServerEvent(
			"checkout_started",
			{
				plan_id: planId,
				plan_price: planPrice,
				currency,
				event_category: "conversion",
				funnel_step: "checkout_initiated",
			},
			userId
		);
	},

	checkoutCompleted: async (
		planId: string,
		subscriptionId: string,
		revenue: number,
		currency = "USD",
		userId?: string
	) => {
		await trackServerEvent(
			"checkout_completed",
			{
				plan_id: planId,
				subscription_id: subscriptionId,
				revenue,
				currency,
				event_category: "conversion",
				funnel_step: "checkout_completed",
			},
			userId
		);
	},

	subscriptionCreated: async (
		planId: string,
		subscriptionId: string,
		revenue: number,
		currency = "USD",
		userId?: string
	) => {
		await trackServerEvent(
			"subscription_started",
			{
				plan_id: planId,
				subscription_id: subscriptionId,
				revenue,
				currency,
				event_category: "conversion",
				subscription_status: "active",
			},
			userId
		);

		// Also set user properties for segmentation
		if (userId) {
			await setUserProperties(userId, {
				subscription_plan: planId,
				subscription_status: "active",
				subscription_id: subscriptionId,
				ltv: revenue, // Lifetime value tracking
			});
		}
	},

	subscriptionCancelled: async (
		reason?: string,
		subscriptionId?: string,
		userId?: string
	) => {
		await trackServerEvent(
			"subscription_cancelled",
			{
				cancellation_reason: reason,
				subscription_id: subscriptionId,
				event_category: "conversion",
				subscription_status: "cancelled",
			},
			userId
		);

		// Update user properties
		if (userId) {
			await setUserProperties(userId, {
				subscription_status: "cancelled",
				cancellation_reason: reason,
			});
		}
	},

	planUpgraded: async (
		fromPlan: string,
		toPlan: string,
		newRevenue: number,
		currency = "USD",
		userId?: string
	) => {
		await trackServerEvent(
			"plan_upgraded",
			{
				from_plan: fromPlan,
				to_plan: toPlan,
				revenue_increase: newRevenue,
				currency,
				event_category: "conversion",
				subscription_status: "upgraded",
			},
			userId
		);

		// Update user properties
		if (userId) {
			await setUserProperties(userId, {
				subscription_plan: toPlan,
				subscription_status: "active",
				last_upgrade_date: new Date().toISOString(),
			});
		}
	},

	paymentFailed: async (
		errorType: string,
		planId?: string,
		userId?: string
	) => {
		await trackServerEvent(
			"payment_failed",
			{
				error_type: errorType,
				plan_id: planId,
				event_category: "conversion",
				payment_status: "failed",
			},
			userId
		);
	},
};
