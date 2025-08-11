import { env } from "@/env";
import { createLogger } from "@/lib/utils/logger";
import type { WebhookPayload } from "@/lib/webhooks/webhook-types";
import {
	WebhookVerificationError,
	validateEvent,
} from "@polar-sh/sdk/webhooks";
import hash from "hash-sum";

const logger = createLogger("billing:webhook");

/**
 * Main webhook endpoint with retry queue integration
 */
export async function POST(req: Request) {
	try {
		const body = await req.text();
		const headers = Object.fromEntries(req.headers.entries());

		// Use unified webhook secret
		const webhookSecret = env.POLAR_WEBHOOK_SECRET;

		if (!webhookSecret) {
			logger.error("Polar webhook secret not configured");
			return Response.json(
				{ error: "Webhook not configured" },
				{ status: 500 }
			);
		}

		// Verify webhook signature first
		let rawEvent: any;
		try {
			rawEvent = validateEvent(body, headers, webhookSecret);
		} catch (error) {
			// Handle signature verification errors
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
			throw error;
		}

		// Create webhook payload for retry queue with deterministic fallback
		const eventId = rawEvent.id || rawEvent.data?.id || hash(body);
		const webhookPayload: WebhookPayload = {
			eventType: rawEvent.type,
			eventId,
			data: rawEvent,
			headers,
			rawBody: body,
			receivedAt: new Date(),
			source: "polar",
		};

		// Trigger per-event task and acknowledge immediately
		// We don't process inline; retries are handled inside the task via wait.for()
		const { handlePolarWebhook } = await import(
			"@/trigger/handle-polar-webhook"
		);
		// Limit source union to 'polar' to match task schema
		await handlePolarWebhook.trigger({
			eventType: webhookPayload.eventType,
			eventId: webhookPayload.eventId,
			data: webhookPayload.data,
			headers: webhookPayload.headers,
			rawBody: webhookPayload.rawBody,
			receivedAt: webhookPayload.receivedAt,
			source: "polar",
		});
		return Response.json({ received: true });
	} catch (error) {
		// Handle unexpected errors
		logger.error("Webhook endpoint error", {
			error:
				error instanceof Error
					? {
							message: error.message,
							name: error.name,
							stack: error.stack,
						}
					: error,
		});

		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
