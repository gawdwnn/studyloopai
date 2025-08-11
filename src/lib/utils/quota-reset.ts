import { db } from "@/db";
import { userPlans, userUsage } from "@/db/schema";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { createLogger } from "@/lib/utils/logger";
import { and, eq, lt } from "drizzle-orm";

const logger = createLogger("quota-reset");

/**
 * Reset user quota if their billing period has expired
 * @param userId - The user ID to check and reset quota for
 * @returns Promise<boolean> - true if quota was reset, false otherwise
 */
export async function resetUserQuotaIfExpired(
	userId: string
): Promise<boolean> {
	return await withErrorHandling(
		async () => {
			return await db.transaction(async (tx) => {
				// Get user's active plan
				const userPlan = await tx.query.userPlans.findFirst({
					where: and(
						eq(userPlans.userId, userId),
						eq(userPlans.isActive, true)
					),
				});

				if (!userPlan || !userPlan.currentPeriodEnd) {
					logger.info("No active plan or period end found for user", {
						userId,
					});
					return false;
				}

				// Get current usage record
				const usage = await tx.query.userUsage.findFirst({
					where: eq(userUsage.userId, userId),
				});

				if (!usage) {
					logger.info("No usage record found for user", { userId });
					return false;
				}

				const now = new Date();
				const shouldResetCycle =
					usage.cycleStart &&
					userPlan.currentPeriodEnd &&
					now > new Date(userPlan.currentPeriodEnd);

				if (!shouldResetCycle) {
					logger.debug("Quota reset not needed for user", {
						userId,
						currentTime: now.toISOString(),
						periodEnd: userPlan.currentPeriodEnd.toISOString(),
						cycleStart: usage.cycleStart.toISOString(),
					});
					return false;
				}

				// Reset usage counters for new cycle
				await tx
					.update(userUsage)
					.set({
						cycleStart: now,
						aiGenerationsCount: 0,
						aiTokensConsumed: 0,
						materialsUploadedCount: 0,
						updatedAt: now,
					})
					.where(eq(userUsage.userId, userId));

				logger.info("Successfully reset quota for user", {
					userId,
					previousCycleStart: usage.cycleStart.toISOString(),
					newCycleStart: now.toISOString(),
					periodEnd: userPlan.currentPeriodEnd.toISOString(),
					resetCounts: {
						aiGenerations: usage.aiGenerationsCount,
						aiTokens: usage.aiTokensConsumed,
						materialsUploaded: usage.materialsUploadedCount,
					},
				});

				return true;
			});
		},
		"resetUserQuotaIfExpired",
		false
	);
}

/**
 * Find all users whose billing period has expired and reset their quotas
 * @returns Promise<number> - number of users whose quotas were reset
 */
export async function resetExpiredUsersQuotas(): Promise<number> {
	return await withErrorHandling(
		async () => {
			const now = new Date();

			// Find users with active plans whose billing period has ended
			const expiredPlans = await db.query.userPlans.findMany({
				where: and(
					eq(userPlans.isActive, true),
					lt(userPlans.currentPeriodEnd, now)
				),
				columns: {
					userId: true,
					currentPeriodEnd: true,
				},
			});

			if (expiredPlans.length === 0) {
				logger.info("No users with expired billing periods found");
				return 0;
			}

			logger.info(
				`Found ${expiredPlans.length} users with expired billing periods`
			);

			let resetCount = 0;
			const resetResults = await Promise.allSettled(
				expiredPlans.map(async (plan) => {
					const wasReset = await resetUserQuotaIfExpired(plan.userId);
					if (wasReset) {
						resetCount++;
					}
					return { userId: plan.userId, wasReset };
				})
			);

			// Log any failures
			resetResults.forEach((result, index) => {
				if (result.status === "rejected") {
					logger.error("Failed to reset quota for user", {
						userId: expiredPlans[index].userId,
						error: result.reason,
					});
				}
			});

			logger.info(
				`Successfully reset quotas for ${resetCount} users out of ${expiredPlans.length} candidates`
			);
			return resetCount;
		},
		"resetExpiredUsersQuotas",
		0
	);
}

/**
 * Reset quota for a specific user (used by webhook handlers)
 * @param userId - The user ID to reset quota for
 * @param reason - The reason for the reset (for logging)
 * @returns Promise<boolean> - true if quota was reset, false otherwise
 */
export async function forceResetUserQuota(
	userId: string,
	reason: string
): Promise<boolean> {
	return await withErrorHandling(
		async () => {
			return await db.transaction(async (tx) => {
				// Get current usage record
				const usage = await tx.query.userUsage.findFirst({
					where: eq(userUsage.userId, userId),
				});

				if (!usage) {
					logger.info("No usage record found for user, creating new one", {
						userId,
						reason,
					});
					// Create new usage record
					await tx.insert(userUsage).values({
						userId,
						cycleStart: new Date(),
					});
					return true;
				}

				const now = new Date();

				// Reset usage counters for new cycle
				await tx
					.update(userUsage)
					.set({
						cycleStart: now,
						aiGenerationsCount: 0,
						aiTokensConsumed: 0,
						materialsUploadedCount: 0,
						updatedAt: now,
					})
					.where(eq(userUsage.userId, userId));

				logger.info("Successfully force reset quota for user", {
					userId,
					reason,
					previousCycleStart: usage.cycleStart.toISOString(),
					newCycleStart: now.toISOString(),
					resetCounts: {
						aiGenerations: usage.aiGenerationsCount,
						aiTokens: usage.aiTokensConsumed,
						materialsUploaded: usage.materialsUploadedCount,
					},
				});

				return true;
			});
		},
		"forceResetUserQuota",
		false
	);
}
