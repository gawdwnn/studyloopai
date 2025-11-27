import { db } from "@/db";
import { users } from "@/db/schema";
import { createLogger } from "@/lib/utils/logger";
import { eq } from "drizzle-orm";
import { createPolarClient } from "./client";

const logger = createLogger("polar:usage-events");

/**
 * Send usage event to Polar for billing tracking
 * Fire-and-forget pattern - logs errors but doesn't throw
 */
export async function sendUsageEvent(
	userId: string,
	eventName: string,
	metadata: { [k: string]: string | number | boolean },
	polarCustomerId?: string
): Promise<void> {
	try {
		// Get polarCustomerId if not provided
		let customerId = polarCustomerId;
		if (!customerId) {
			const user = await db.query.users.findFirst({
				where: eq(users.userId, userId),
				columns: { polarCustomerId: true },
			});

			if (!user?.polarCustomerId) {
				logger.warn("No Polar customer ID found for user", {
					userId,
					eventName,
					hasUser: !!user,
				});
				return;
			}

			customerId = user.polarCustomerId;
		}

		// Send event to Polar
		const polar = createPolarClient();
		await polar.events.ingest({
			events: [
				{
					name: eventName,
					externalCustomerId: customerId,
					metadata,
				},
			],
		});

		logger.info("Usage event sent to Polar", {
			eventName,
			userId,
			customerId: `${customerId.substring(0, 8)}...`, // Log partial ID for privacy
			metadataKeys: Object.keys(metadata),
		});
	} catch (error) {
		// Silent failure - log but don't throw to avoid breaking user operations
		logger.error(
			{
				err: error,
				eventName,
				userId,
			},
			"Failed to send usage event to Polar"
		);
	}
}
