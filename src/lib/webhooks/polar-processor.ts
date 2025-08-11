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
			eventId: (event as any).data?.id,
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
				if (data.currentPeriodEnd) {
					currentPeriodEnd = new Date(data.currentPeriodEnd);
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

					if (data.customerId) {
						const userUpdates: {
							polarCustomerId: string;
							updatedAt: Date;
							currentOnboardingStep?: number;
						} = {
							polarCustomerId: data.customerId,
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
					firstPrice && "amount" in firstPrice
						? (firstPrice.amount as number) / 100
						: 0;
				const currency =
					firstPrice && "currency" in firstPrice
						? (firstPrice.currency as string)
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
						currentPeriodEnd: data.currentPeriodEnd
							? new Date(data.currentPeriodEnd)
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
					data.canceledAt ? "scheduled" : "immediate",
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

				return {
					success: true,
					shouldRetry: false,
					result: { orderId: data.id, userId },
				};
			}

			default:
				logger.info("Unhandled webhook event type", { eventType: event.type });
				return {
					success: true,
					shouldRetry: false,
					result: { skipped: true, reason: "unhandled event type" },
				};
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
