/**
 * Idempotency Service - Prevents duplicate processing of critical operations
 * Provides utilities for webhook processing, payment handling, and other critical operations
 */

import { db } from "@/db";
import { idempotencyKeys } from "@/db/schema";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { createLogger } from "@/lib/utils/logger";
import { eq } from "drizzle-orm";

const logger = createLogger("idempotency-service");

export type OperationType = "webhook" | "payment" | "upload" | "generation";
export type IdempotencyStatus = "processing" | "completed" | "failed";

export interface IdempotencyRecord {
	id: string;
	idempotencyKey: string;
	operationType: OperationType;
	resourceId?: string;
	userId?: string;
	status: IdempotencyStatus;
	resultData?: unknown;
	errorMessage?: string;
	retryCount: number;
	maxRetries: number;
	lastRetryAt?: Date;
	processingStartedAt: Date;
	processingCompletedAt?: Date;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
	metadata?: unknown;
}

export interface CreateIdempotencyKeyOptions {
	operationType: OperationType;
	resourceId?: string;
	userId?: string;
	maxRetries?: number;
	ttlHours?: number; // Time to live in hours (default: 24)
	metadata?: Record<string, unknown>;
}

export interface IdempotencyResult {
	isFirstRun: boolean;
	record: IdempotencyRecord;
	existingResult?: unknown;
}

/**
 * Create or retrieve an idempotency key for an operation
 * Returns whether this is the first run of the operation
 */
export async function ensureIdempotencyKey(
	idempotencyKey: string,
	options: CreateIdempotencyKeyOptions
): Promise<IdempotencyResult> {
	return await withErrorHandling(
		async () => {
			const {
				operationType,
				resourceId,
				userId,
				maxRetries = 3,
				ttlHours = 24,
				metadata,
			} = options;

			const now = new Date();
			const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

			// Try to find existing record
			const existingRecord = await db.query.idempotencyKeys.findFirst({
				where: eq(idempotencyKeys.idempotencyKey, idempotencyKey),
			});

			if (existingRecord) {
				// Check if record has expired
				if (existingRecord.expiresAt < now) {
					// Remove expired record and create new one
					await db
						.delete(idempotencyKeys)
						.where(eq(idempotencyKeys.id, existingRecord.id));

					// Insert with conflict guard to avoid race conditions
					const [newRecord] = await db
						.insert(idempotencyKeys)
						.values({
							idempotencyKey,
							operationType,
							resourceId,
							userId,
							maxRetries,
							expiresAt,
							metadata,
						})
						.onConflictDoNothing({ target: idempotencyKeys.idempotencyKey })
						.returning();

					if (!newRecord) {
						// Another concurrent request created it; fetch existing
						const existing = await db.query.idempotencyKeys.findFirst({
							where: eq(idempotencyKeys.idempotencyKey, idempotencyKey),
						});
						return {
							isFirstRun: false,
							record: existing as IdempotencyRecord,
							existingResult: existing?.resultData,
						};
					}

					return {
						isFirstRun: true,
						record: newRecord as IdempotencyRecord,
					};
				}

				// Return existing record
				return {
					isFirstRun: false,
					record: existingRecord as IdempotencyRecord,
					existingResult: existingRecord.resultData,
				};
			}

			// Create new record
			const [newRecord] = await db
				.insert(idempotencyKeys)
				.values({
					idempotencyKey,
					operationType,
					resourceId,
					userId,
					maxRetries,
					expiresAt,
					metadata,
				})
				.returning();

			return {
				isFirstRun: true,
				record: newRecord as IdempotencyRecord,
			};
		},
		"ensureIdempotencyKey",
		{
			isFirstRun: false,
			record: {} as IdempotencyRecord,
			existingResult: { error: "Failed to ensure idempotency key" },
		}
	);
}

/**
 * Mark an idempotency operation as completed with result data
 */
export async function completeIdempotencyOperation(
	idempotencyKey: string,
	resultData?: unknown
): Promise<boolean> {
	return await withErrorHandling(
		async () => {
			const now = new Date();

			const result = await db
				.update(idempotencyKeys)
				.set({
					status: "completed",
					resultData,
					processingCompletedAt: now,
					updatedAt: now,
				})
				.where(eq(idempotencyKeys.idempotencyKey, idempotencyKey))
				.returning();

			if (result.length === 0) {
				logger.warn("Attempted to complete non-existent idempotency key", {
					idempotencyKey,
				});
				return false;
			}

			logger.info("Idempotency operation completed", {
				idempotencyKey,
				operationType: result[0].operationType,
			});

			return true;
		},
		"completeIdempotencyOperation",
		false
	);
}

/**
 * Mark an idempotency operation as failed with error details
 */
export async function failIdempotencyOperation(
	idempotencyKey: string,
	errorMessage: string,
	shouldRetry = false
): Promise<boolean> {
	return await withErrorHandling(
		async () => {
			const now = new Date();

			// Get current record to check retry count
			const currentRecord = await db.query.idempotencyKeys.findFirst({
				where: eq(idempotencyKeys.idempotencyKey, idempotencyKey),
			});

			if (!currentRecord) {
				logger.warn("Attempted to fail non-existent idempotency key", {
					idempotencyKey,
				});
				return false;
			}

			const newRetryCount = currentRecord.retryCount + 1;
			const canRetry = shouldRetry && newRetryCount <= currentRecord.maxRetries;

			const result = await db
				.update(idempotencyKeys)
				.set({
					status: canRetry ? "processing" : "failed",
					errorMessage,
					retryCount: newRetryCount,
					lastRetryAt: canRetry ? now : currentRecord.lastRetryAt,
					processingCompletedAt: canRetry ? null : now,
					updatedAt: now,
				})
				.where(eq(idempotencyKeys.idempotencyKey, idempotencyKey))
				.returning();

			if (result.length === 0) {
				return false;
			}

			logger.info("Idempotency operation failed", {
				idempotencyKey,
				operationType: result[0].operationType,
				retryCount: newRetryCount,
				canRetry,
				errorMessage,
			});

			return true;
		},
		"failIdempotencyOperation",
		false
	);
}

/**
 * Get pending operations that need retry
 */
export async function getPendingRetries(
	operationType?: OperationType,
	limit = 50
): Promise<IdempotencyRecord[]> {
	return await withErrorHandling(
		async () => {
			const query = db.query.idempotencyKeys.findMany({
				where: (table, { and, eq, lt, gt }) =>
					and(
						eq(table.status, "processing"),
						gt(table.retryCount, 0),
						lt(table.retryCount, table.maxRetries),
						operationType ? eq(table.operationType, operationType) : undefined
					),
				orderBy: (table, { asc }) => [asc(table.lastRetryAt)],
				limit,
			});

			const records = await query;
			return records as IdempotencyRecord[];
		},
		"getPendingRetries",
		[]
	);
}

/**
 * Generate a unique idempotency key for webhook operations
 */
export function generateWebhookIdempotencyKey(
	webhookId: string,
	eventType: string
): string {
	return `webhook:${eventType}:${webhookId}`;
}
