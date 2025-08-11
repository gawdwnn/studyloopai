import { resetExpiredUsersQuotas } from "@/lib/utils/quota-reset";
import { logger, schedules } from "@trigger.dev/sdk/v3";

/**
 * Hourly cron job to reset quotas for users whose billing periods have expired
 *
 * This serves as a backup mechanism to ensure quota resets happen even if:
 * - Webhook delivery fails
 * - Webhook processing fails
 * - There are delays in webhook processing
 */
export const quotaResetCron = schedules.task({
	id: "quota-reset-cron",
	// Run every hour at minute 0
	cron: "0 * * * *",
	run: async (payload) => {
		const startTime = new Date();

		logger.info("Starting quota reset cron job", {
			scheduledTime: payload.timestamp,
			actualStartTime: startTime,
			timezone: payload.timezone,
			scheduleId: payload.scheduleId,
		});

		try {
			// Find and reset quotas for users with expired billing periods
			const resetCount = await resetExpiredUsersQuotas();

			const duration = Date.now() - startTime.getTime();

			logger.info("Quota reset cron job completed successfully", {
				usersProcessed: resetCount,
				durationMs: duration,
				scheduledTime: payload.timestamp,
				nextRuns: payload.upcoming?.slice(0, 3), // Show next 3 runs
			});

			return {
				success: true,
				usersProcessed: resetCount,
				durationMs: duration,
				processedAt: new Date(),
			};
		} catch (error) {
			const duration = Date.now() - startTime.getTime();

			logger.error("Quota reset cron job failed", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				durationMs: duration,
				scheduledTime: payload.timestamp,
			});

			// Don't throw the error - we want the cron to continue running
			// even if individual executions fail
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				durationMs: duration,
				processedAt: new Date(),
			};
		}
	},
});
