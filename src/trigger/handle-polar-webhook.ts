import {
	completeIdempotencyOperation,
	ensureIdempotencyKey,
	failIdempotencyOperation,
	generateWebhookIdempotencyKey,
} from "@/lib/services/idempotency-service";
import { processPolarWebhook } from "@/lib/webhooks/polar-processor";
import { logger, schemaTask, wait } from "@trigger.dev/sdk";
import { z } from "zod";

// Payload we pass from the webhook route
const PolarWebhookPayload = z.object({
	eventType: z.string(),
	eventId: z.string(),
	data: z.any(),
	headers: z.record(z.string()),
	rawBody: z.string(),
	receivedAt: z.date(),
	source: z.literal("polar"),
});

type PolarWebhookPayloadType = z.infer<typeof PolarWebhookPayload>;

function calculateRetryDelay(
	attemptNumber: number,
	{
		baseDelayMs = 2000,
		backoffMultiplier = 2,
		maxDelayMs = 300_000,
		jitter = true,
	}: {
		baseDelayMs?: number;
		backoffMultiplier?: number;
		maxDelayMs?: number;
		jitter?: boolean;
	} = {}
): number {
	const delay = Math.min(
		baseDelayMs * Math.pow(backoffMultiplier, attemptNumber),
		maxDelayMs
	);
	if (!jitter) return delay;
	const jitterFactor = 0.2;
	const j = delay * jitterFactor * (Math.random() - 0.5) * 2;
	return Math.max(delay + j, baseDelayMs);
}

export const handlePolarWebhook = schemaTask({
	id: "handle-polar-webhook",
	schema: PolarWebhookPayload,
	maxDuration: 600,
	run: async (payload: PolarWebhookPayloadType) => {
		const idempotencyKey = generateWebhookIdempotencyKey(
			payload.eventId,
			payload.eventType
		);

		// Ensure idempotency record exists and persist full payload metadata
		const idem = await ensureIdempotencyKey(idempotencyKey, {
			operationType: "webhook",
			resourceId: payload.eventId,
			maxRetries: 5,
			ttlHours: 48,
			metadata: {
				eventType: payload.eventType,
				source: payload.source,
				receivedAt: payload.receivedAt,
				data: payload.data,
				headers: payload.headers,
				rawBody: payload.rawBody,
			},
		});

		if (!idem.isFirstRun && idem.record.status === "completed") {
			logger.info("Webhook already completed (idempotent)", { idempotencyKey });
			return { success: true };
		}

		let attempt = idem.record.retryCount; // continue from previous count if any
		const maxRetries = idem.record.maxRetries ?? 5;

		// Attempt loop with delayed waits between retries
		// We keep the single run alive by checkpointing during waits
		// and recording failures to update retryCount/lastRetryAt
		// Stop when success, non-retryable, or attempts exceed max
		// processPolarWebhook returns { success, shouldRetry, error }
		// Note: we rely on persisted metadata for exact payload replay
		// The payload passed here is already authoritative
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const result = await processPolarWebhook({
				eventType: payload.eventType,
				eventId: payload.eventId,
				data: payload.data,
				headers: payload.headers,
				rawBody: payload.rawBody,
				receivedAt: payload.receivedAt,
				source: "polar",
			});

			if (result.success) {
				await completeIdempotencyOperation(idempotencyKey, result.result);
				return { success: true };
			}

			// Non-retryable or out of retries
			if (!result.shouldRetry || attempt >= maxRetries) {
				await failIdempotencyOperation(
					idempotencyKey,
					result.error || "Processing failed",
					false
				);
				return { success: false };
			}

			// Retryable: increment counter and wait with backoff
			attempt += 1;
			await failIdempotencyOperation(
				idempotencyKey,
				result.error || "Processing failed",
				true
			);

			const delay = calculateRetryDelay(attempt - 1);
			logger.info("Waiting before retry", { idempotencyKey, attempt, delay });
			// wait.for supports seconds/minutes/hours; convert ms to seconds
			await wait.for({ seconds: Math.ceil(delay / 1000) });
		}
	},
});
