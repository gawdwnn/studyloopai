import { db } from "@/db";
import { userPlans, users } from "@/db/schema";
import { billingEvents } from "@/lib/analytics/events";
import { createLogger } from "@/lib/utils/logger";
import { validatePolarWebhook } from "@/lib/webhooks/polar-schemas";
import type {
	WebhookPayload,
	WebhookProcessingResult,
} from "@/lib/webhooks/webhook-types";
import { and, eq } from "drizzle-orm";

const logger = createLogger("billing:webhook-processor");

/**
 * Shared Polar webhook processor to be reused by the HTTP route and the retry scheduler
 */
export async function processPolarWebhook(
	payload: WebhookPayload
): Promise<WebhookProcessingResult> {
	try {
		// Validate the webhook data using comprehensive Zod schemas (colocated)
		const validationResult = validatePolarWebhook(JSON.parse(payload.rawBody));
		const event = validationResult;

		logger.info("Processing validated Polar webhook", {
			eventType: event.type,
			eventId: event.data?.id || "unknown",
		});

		switch (event.type) {
			case "subscription.created": {
				const data = event.data;

				if (!data.metadata) {
					logger.error("Missing metadata in subscription.created webhook", {
						eventType: "subscription.created",
					});
					return {
						success: false,
						shouldRetry: false,
						error: "Invalid metadata",
					};
				}

				const { userId, planId, context } = data.metadata;

				const existingUserPlan = await db.query.userPlans.findFirst({
					where: and(
						eq(userPlans.userId, userId),
						eq(userPlans.isActive, true)
					),
				});

				const anyExistingPlan =
					existingUserPlan ||
					(await db.query.userPlans.findFirst({
						where: eq(userPlans.userId, userId),
					}));

				if (existingUserPlan) {
					logger.warn("User already has active plan for subscription.created", {
						userId,
						existingPlanId: existingUserPlan.planId,
						newPlanId: planId,
						subscriptionId: data.id,
					});
				}

				let currentPeriodEnd: Date | null = null;
				if (data.current_period_end) {
					currentPeriodEnd = new Date(data.current_period_end);
				} else if (planId === "monthly") {
					currentPeriodEnd = new Date();
					currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
				} else if (planId === "yearly") {
					currentPeriodEnd = new Date();
					currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
				}

				await db.transaction(async (tx) => {
					if (existingUserPlan) {
						await tx
							.update(userPlans)
							.set({
								planId: planId || existingUserPlan.planId,
								polarSubscriptionId: data.id,
								polarPriceId: data.prices?.[0]?.id || null,
								subscriptionStatus: "active",
								currentPeriodEnd,
								isActive: true,
								updatedAt: new Date(),
								...(existingUserPlan.polarCheckoutId && {
									polarCheckoutId: existingUserPlan.polarCheckoutId,
								}),
							})
							.where(eq(userPlans.userId, userId));
					} else {
						await tx.insert(userPlans).values({
							userId,
							planId: planId || "monthly",
							polarSubscriptionId: data.id,
							polarPriceId: data.prices?.[0]?.id || null,
							subscriptionStatus: "active",
							currentPeriodEnd,
							isActive: true,
							polarCheckoutId: anyExistingPlan?.polarCheckoutId || null,
						});
					}

					if (data.customer_id) {
						const userUpdates: {
							polarCustomerId: string;
							updatedAt: Date;
							currentOnboardingStep?: number;
						} = {
							polarCustomerId: data.customer_id,
							updatedAt: new Date(),
						};

						if (context === "onboarding") {
							userUpdates.currentOnboardingStep = 4;
						}

						await tx
							.update(users)
							.set(userUpdates)
							.where(eq(users.userId, userId));
					}
				});

				const firstPrice = data.prices?.[0];
				const revenue =
					firstPrice && "price_amount" in firstPrice
						? (firstPrice.price_amount as number) / 100
						: 0;
				const currency =
					firstPrice && "price_currency" in firstPrice
						? (firstPrice.price_currency as string)
						: "USD";
				await billingEvents.subscriptionCreated(
					planId || "unknown",
					data.id,
					revenue,
					currency,
					userId
				);

				logger.info("Subscription created successfully", { userId, planId });

				return {
					success: true,
					shouldRetry: false,
					result: { userId, planId, subscriptionId: data.id },
				};
			}

			case "subscription.updated": {
				const data = event.data;
				const existingUserPlan = await db.query.userPlans.findFirst({
					where: eq(userPlans.polarSubscriptionId, data.id),
				});

				if (!existingUserPlan) {
					logger.warn("Subscription update for non-existent user plan", {
						subscriptionId: data.id,
					});
					return {
						success: false,
						shouldRetry: true,
						error: "Subscription not found",
					};
				}

				await db
					.update(userPlans)
					.set({
						subscriptionStatus:
							data.status === "active" ? "active" : "canceled",
						currentPeriodEnd: data.current_period_end
							? new Date(data.current_period_end)
							: null,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(userPlans.polarSubscriptionId, data.id),
							eq(userPlans.userId, existingUserPlan.userId)
						)
					);

				logger.info("Subscription updated", {
					subscriptionId: data.id,
					status: data.status,
				});

				return {
					success: true,
					shouldRetry: false,
					result: { subscriptionId: data.id, status: data.status },
				};
			}

			case "subscription.canceled": {
				const data = event.data;
				const userPlan = await db.query.userPlans.findFirst({
					where: eq(userPlans.polarSubscriptionId, data.id),
				});

				if (!userPlan) {
					logger.warn("Subscription cancellation for non-existent user plan", {
						subscriptionId: data.id,
					});
					return {
						success: false,
						shouldRetry: true,
						error: "Subscription not found",
					};
				}

				await db
					.update(userPlans)
					.set({
						subscriptionStatus: "canceled",
						isActive: false,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(userPlans.polarSubscriptionId, data.id),
							eq(userPlans.userId, userPlan.userId)
						)
					);

				await billingEvents.subscriptionCancelled(
					data.canceled_at ? "scheduled" : "immediate",
					data.id,
					userPlan?.userId
				);

				logger.info("Subscription cancelled", { subscriptionId: data.id });

				return {
					success: true,
					shouldRetry: false,
					result: { subscriptionId: data.id, cancelled: true },
				};
			}

			case "checkout.created": {
				const data = event.data;
				const userId = data.metadata?.userId;
				if (!userId || !data.id) {
					logger.warn("Missing metadata in checkout.created", {
						hasUserId: !!userId,
						hasDataId: !!data.id,
					});
					return {
						success: true,
						shouldRetry: false,
						result: { skipped: true, reason: "missing metadata" },
					};
				}

				const existingUserPlan = await db.query.userPlans.findFirst({
					where: eq(userPlans.userId, userId),
				});
				if (existingUserPlan) {
					await db
						.update(userPlans)
						.set({ polarCheckoutId: data.id, updatedAt: new Date() })
						.where(eq(userPlans.userId, userId));
				}

				return {
					success: true,
					shouldRetry: false,
					result: { checkoutId: data.id, userId },
				};
			}

			case "order.created": {
				const data = event.data;
				const userId = data.metadata?.userId;
				if (!userId || !data.id) {
					logger.warn("Missing metadata in order.created", {
						hasUserId: !!userId,
						hasDataId: !!data.id,
					});
					return {
						success: true,
						shouldRetry: false,
						result: { skipped: true, reason: "missing metadata" },
					};
				}

				const existingUserPlan = await db.query.userPlans.findFirst({
					where: eq(userPlans.userId, userId),
				});
				if (existingUserPlan) {
					await db
						.update(userPlans)
						.set({ polarOrderId: data.id, updatedAt: new Date() })
						.where(eq(userPlans.userId, userId));
				}

				// Handle quota reset for subscription renewals
				if (data.billing_reason === "subscription_cycle") {
					logger.info("Processing subscription renewal for quota reset", {
						userId,
						orderId: data.id,
						billingReason: data.billing_reason,
					});

					const { forceResetUserQuota } = await import(
						"@/lib/utils/quota-reset"
					);
					const wasReset = await forceResetUserQuota(
						userId,
						`subscription_renewal_order_${data.id}`
					);

					logger.info("Quota reset result for subscription renewal", {
						userId,
						orderId: data.id,
						wasReset,
					});

					return {
						success: true,
						shouldRetry: false,
						result: {
							orderId: data.id,
							userId,
							quotaReset: wasReset,
							billingReason: data.billing_reason,
						},
					};
				}

				return {
					success: true,
					shouldRetry: false,
					result: { orderId: data.id, userId },
				};
			}

			default: {
				logger.info("Unhandled webhook event type", {
					eventType: "unknown",
				});
				return {
					success: true,
					shouldRetry: false,
					result: { skipped: true, reason: "unhandled event type" },
				};
			}
		}
	} catch (error) {
		logger.error("Error processing webhook", {
			error: error instanceof Error ? error.message : String(error),
		});
		return {
			success: false,
			shouldRetry: true,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
