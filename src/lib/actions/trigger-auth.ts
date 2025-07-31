"use server";

import { logger } from "@/lib/utils/logger";
import { auth } from "@trigger.dev/sdk";

export async function generatePublicToken(
	runId: string,
	expirationTime = "15m"
) {
	try {
		const publicToken = await auth.createPublicToken({
			scopes: {
				read: {
					runs: [runId],
				},
			},
			expirationTime, // Allow custom expiration, default to 15 minutes
		});
		return { success: true, token: publicToken };
	} catch (error) {
		logger.error("Failed to generate public token", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			action: "generatePublicToken",
			runId,
			expirationTime,
		});
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to generate token",
		};
	}
}
