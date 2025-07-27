"use server";

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
		console.error("Failed to generate public token:", error);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to generate token",
		};
	}
}
