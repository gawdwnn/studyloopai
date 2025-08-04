import { db } from "@/db";
import { userPlans, users } from "@/db/schema";
import { env } from "@/env";
import { billingEvents } from "@/lib/analytics/events";
import { createLogger } from "@/lib/utils/logger";
import {
	WebhookVerificationError,
	validateEvent,
} from "@polar-sh/sdk/webhooks";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const logger = createLogger("billing:webhook");

// Input validation schema for webhook metadata
const webhookMetadataSchema = z
	.object({
		userId: z.string().uuid(),
		planId: z.enum(["monthly", "yearly"]).optional(),
		context: z.enum(["onboarding", "account"]).optional(),
	})
	.strict();

export async function POST(req: Request) {
	try {
		const body = await req.text();

		// Use unified webhook secret (consistent with Polar client approach)
		const webhookSecret = env.POLAR_WEBHOOK_SECRET;

		if (!webhookSecret) {
			logger.error("Polar webhook secret not configured");
			return Response.json(
				{ error: "Webhook not configured" },
				{ status: 500 }
			);
		}

		// Convert Headers object to plain object for validateEvent
		const headersObj = Object.fromEntries(req.headers.entries());
		const event = validateEvent(body, headersObj, webhookSecret);

		logger.info("Processing Polar webhook", {
			eventType: event.type,
			eventId: event.data?.id,
		});

		// Handle different event types
		switch (event.type) {
			case "subscription.created": {
				const data = event.data;

				// Validate metadata with schema
				const metadataResult = webhookMetadataSchema.safeParse(data.metadata);
				if (!metadataResult.success) {
					logger.error("Invalid metadata in subscription.created webhook", {
						eventType: "subscription.created",
						validationErrors: metadataResult.error.errors,
						availableMetadataKeys: Object.keys(data.metadata || {}),
					});
					return Response.json({ error: "Invalid metadata" }, { status: 400 });
				}

				const { userId, planId, context } = metadataResult.data;

				// Check if user already has an active plan to prevent duplicates
				// Also get any existing plan (active or not) to preserve checkout ID
				const existingUserPlan = await db.query.userPlans.findFirst({
					where: and(
						eq(userPlans.userId, userId),
						eq(userPlans.isActive, true)
					),
				});

				// Also check for any existing plan (including inactive) to preserve checkout ID
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
					// Update existing plan instead of creating duplicate
				}

				// Calculate current period end based on plan
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

				// Use database transaction for atomic operations
				await db.transaction(async (tx) => {
					if (existingUserPlan) {
						// Update existing plan while preserving checkout ID
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
								// Preserve existing checkout ID if present
								...(existingUserPlan.polarCheckoutId && {
									polarCheckoutId: existingUserPlan.polarCheckoutId,
								}),
							})
							.where(eq(userPlans.userId, userId));
					} else {
						// Create new user plan record after successful payment
						// Preserve checkout ID if user had one from previous checkout
						await tx.insert(userPlans).values({
							userId,
							planId: planId || "monthly",
							polarSubscriptionId: data.id,
							polarPriceId: data.prices?.[0]?.id || null,
							subscriptionStatus: "active",
							currentPeriodEnd,
							isActive: true,
							// Preserve checkout ID from any previous plan
							polarCheckoutId: anyExistingPlan?.polarCheckoutId || null,
						});
					}

					// Update user with Polar customer ID if not already set
					if (data.customerId) {
						const userUpdates: {
							polarCustomerId: string;
							updatedAt: Date;
							currentOnboardingStep?: number;
						} = {
							polarCustomerId: data.customerId,
							updatedAt: new Date(),
						};

						// If this came from onboarding, ensure onboarding step is advanced
						// so user can complete the flow
						if (context === "onboarding") {
							userUpdates.currentOnboardingStep = 4; // completion step
						}

						await tx
							.update(users)
							.set(userUpdates)
							.where(eq(users.userId, userId));
					}
				});

				// Track subscription created event with revenue
				const firstPrice = data.prices?.[0];
				const revenue =
					firstPrice && "amount" in firstPrice
						? (firstPrice.amount as number) / 100
						: 0; // Convert cents to dollars
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

				logger.info("Subscription created successfully", {
					userId,
					planId,
				});

				break;
			}

			case "subscription.updated": {
				const data = event.data;

				// First verify the subscription belongs to a valid user
				const existingUserPlan = await db.query.userPlans.findFirst({
					where: eq(userPlans.polarSubscriptionId, data.id),
				});

				if (!existingUserPlan) {
					logger.warn("Subscription update for non-existent user plan", {
						subscriptionId: data.id,
					});
					return Response.json(
						{ error: "Subscription not found" },
						{ status: 400 }
					);
				}

				// Update subscription status with user ownership validation
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

				break;
			}

			case "subscription.canceled": {
				const data = event.data;

				// Get user ID from subscription
				const userPlan = await db.query.userPlans.findFirst({
					where: eq(userPlans.polarSubscriptionId, data.id),
				});

				if (!userPlan) {
					logger.warn("Subscription cancellation for non-existent user plan", {
						subscriptionId: data.id,
					});
					return Response.json(
						{ error: "Subscription not found" },
						{ status: 400 }
					);
				}

				// Mark subscription as canceled with user ownership validation
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

				// Track subscription cancelled event with enhanced data
				await billingEvents.subscriptionCancelled(
					data.canceledAt ? "scheduled" : "immediate",
					data.id,
					userPlan?.userId
				);

				logger.info("Subscription cancelled", {
					subscriptionId: data.id,
				});

				break;
			}

			case "checkout.created": {
				const data = event.data;

				// Validate metadata
				const userId = data.metadata?.userId as string;
				if (!userId || !data.id) {
					logger.warn("Missing metadata in checkout.created", {
						hasUserId: !!userId,
						hasDataId: !!data.id,
					});
					break;
				}

				// Verify user exists before updating
				const existingUserPlan = await db.query.userPlans.findFirst({
					where: eq(userPlans.userId, userId),
				});

				if (existingUserPlan) {
					// Store checkout ID for tracking with user ownership validation
					await db
						.update(userPlans)
						.set({
							polarCheckoutId: data.id,
							updatedAt: new Date(),
						})
						.where(eq(userPlans.userId, userId));
				}

				break;
			}

			case "order.created": {
				const data = event.data;

				// Validate metadata
				const userId = data.metadata?.userId as string;
				if (!userId || !data.id) {
					logger.warn("Missing metadata in order.created", {
						hasUserId: !!userId,
						hasDataId: !!data.id,
					});
					break;
				}

				// Verify user exists before updating
				const existingUserPlan = await db.query.userPlans.findFirst({
					where: eq(userPlans.userId, userId),
				});

				if (existingUserPlan) {
					// Store order ID for tracking with user ownership validation
					await db
						.update(userPlans)
						.set({
							polarOrderId: data.id,
							updatedAt: new Date(),
						})
						.where(eq(userPlans.userId, userId));
				}

				break;
			}

			default:
				logger.info("Unhandled webhook event type", {
					eventType: event.type,
				});
		}

		return Response.json({ received: true });
	} catch (error) {
		// Handle webhook signature verification errors specifically
		if (error instanceof WebhookVerificationError) {
			logger.warn("Webhook signature verification failed", {
				error: error.message,
				userAgent: req.headers.get("user-agent"),
			});
			return Response.json(
				{ error: "Invalid webhook signature" },
				{ status: 403 }
			);
		}

		// Handle other processing errors
		logger.error("Webhook processing failed", {
			error:
				error instanceof Error
					? {
							message: error.message,
							name: error.name,
							stack: error.stack,
						}
					: error,
		});

		return Response.json(
			{ error: "Webhook processing failed" },
			{ status: 500 }
		);
	}
}
