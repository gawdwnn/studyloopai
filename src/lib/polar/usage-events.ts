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
	metadata: Record<string, any>,
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
		logger.error("Failed to send usage event to Polar", {
			error: error instanceof Error ? error.message : String(error),
			eventName,
			userId,
			stack: error instanceof Error ? error.stack : undefined,
		});
	}
}

/**
 * Batch send multiple usage events to Polar
 * Useful for sending multiple related events together
 */
export async function sendBatchUsageEvents(
	userId: string,
	events: Array<{
		name: string;
		metadata: Record<string, any>;
	}>,
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
				logger.warn("No Polar customer ID found for batch events", {
					userId,
					eventCount: events.length,
					hasUser: !!user,
				});
				return;
			}

			customerId = user.polarCustomerId;
		}

		// Send batch events to Polar
		const polar = createPolarClient();
		await polar.events.ingest({
			events: events.map((event) => ({
				name: event.name,
				externalCustomerId: customerId,
				metadata: event.metadata,
			})),
		});

		logger.info("Batch usage events sent to Polar", {
			userId,
			customerId: `${customerId.substring(0, 8)}...`, // Log partial ID for privacy
			eventCount: events.length,
			eventNames: events.map((e) => e.name),
		});
	} catch (error) {
		// Silent failure - log but don't throw to avoid breaking user operations
		logger.error("Failed to send batch usage events to Polar", {
			error: error instanceof Error ? error.message : String(error),
			userId,
			eventCount: events.length,
			stack: error instanceof Error ? error.stack : undefined,
		});
	}
}

/**
 * Helper to resolve Polar customer ID for a user
 * Returns null if not found to allow graceful handling
 */
export async function getUserPolarCustomerId(
	userId: string
): Promise<string | null> {
	try {
		const user = await db.query.users.findFirst({
			where: eq(users.userId, userId),
			columns: { polarCustomerId: true },
		});

		return user?.polarCustomerId || null;
	} catch (error) {
		logger.error("Failed to resolve Polar customer ID", {
			error: error instanceof Error ? error.message : String(error),
			userId,
		});
		return null;
	}
}
