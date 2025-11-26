"use server";

import { db } from "@/db";
import { cuecardScheduling } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import type { CuecardScheduling } from "@/types/database-types";
import { and, eq } from "drizzle-orm";

/**
 * SuperMemo 2 Algorithm Constants
 * Based on research by Piotr Wozniak
 */
const INITIAL_INTERVAL = 1; // 1 day for first review
const INITIAL_EASE_FACTOR = 250; // 2.5 multiplier (stored as integer)
const MIN_EASE_FACTOR = 130; // 1.3 minimum multiplier
const MAX_EASE_FACTOR = 350; // 3.5 maximum multiplier

/**
 * Calculate the next review interval based on SuperMemo 2 algorithm
 * @param currentInterval Current interval in days
 * @param easeFactor Current ease factor (multiplied by 100)
 * @param isCorrect Whether the card was answered correctly
 * @returns New interval in days
 */
function calculateNextInterval(
	currentInterval: number,
	easeFactor: number,
	isCorrect: boolean
): number {
	if (!isCorrect) {
		// Reset interval for incorrect answers
		return INITIAL_INTERVAL;
	}

	if (currentInterval === 0) {
		return INITIAL_INTERVAL;
	}

	if (currentInterval === 1) {
		return 6; // Second interval is always 6 days
	}

	// For subsequent intervals: interval = previous_interval * ease_factor
	return Math.round(currentInterval * (easeFactor / 100));
}

/**
 * Calculate the new ease factor based on response quality
 * @param currentEaseFactor Current ease factor (multiplied by 100)
 * @param isCorrect Whether the card was answered correctly
 * @param responseTime Response time in milliseconds (for quality assessment)
 * @returns New ease factor
 */
function calculateNewEaseFactor(
	currentEaseFactor: number,
	isCorrect: boolean,
	responseTime: number
): number {
	if (!isCorrect) {
		// Decrease ease factor for incorrect answers
		const newFactor = currentEaseFactor - 20;
		return Math.max(newFactor, MIN_EASE_FACTOR);
	}

	// Assess quality based on response time (quick responses = higher quality)
	const quality = responseTime < 3000 ? 5 : responseTime < 8000 ? 4 : 3;

	// SuperMemo 2 ease factor adjustment formula
	const adjustment = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
	const newFactor = Math.round(currentEaseFactor + adjustment * 100);

	return Math.min(Math.max(newFactor, MIN_EASE_FACTOR), MAX_EASE_FACTOR);
}

interface UpdateSchedulingParams {
	cardId: string;
	userId: string;
	isCorrect: boolean;
	responseTime: number;
}

/**
 * Update cuecard scheduling based on user response
 */
export async function updateCuecardScheduling({
	cardId,
	userId,
	isCorrect,
	responseTime,
}: UpdateSchedulingParams): Promise<CuecardScheduling | null> {
	try {
		const {
			data: { user },
		} = await (await getServerClient()).auth.getUser();
		if (!user || user.id !== userId) {
			throw new Error("Authentication required");
		}

		// Get existing scheduling record
		const existingScheduling = await db.query.cuecardScheduling.findFirst({
			where: and(
				eq(cuecardScheduling.cardId, cardId),
				eq(cuecardScheduling.userId, userId)
			),
		});

		const now = new Date();
		let newInterval: number;
		let newEaseFactor: number;
		let consecutiveCorrect: number;

		if (existingScheduling) {
			// Update existing record
			newInterval = calculateNextInterval(
				existingScheduling.intervalDays,
				existingScheduling.easeFactor,
				isCorrect
			);
			newEaseFactor = calculateNewEaseFactor(
				existingScheduling.easeFactor,
				isCorrect,
				responseTime
			);
			consecutiveCorrect = isCorrect
				? existingScheduling.consecutiveCorrect + 1
				: 0;
		} else {
			// Create initial scheduling
			newInterval = calculateNextInterval(0, INITIAL_EASE_FACTOR, isCorrect);
			newEaseFactor = calculateNewEaseFactor(
				INITIAL_EASE_FACTOR,
				isCorrect,
				responseTime
			);
			consecutiveCorrect = isCorrect ? 1 : 0;
		}

		// Calculate next review date
		const nextReviewAt = new Date(now);
		nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

		const schedulingData = {
			cardId,
			userId,
			intervalDays: newInterval,
			easeFactor: newEaseFactor,
			consecutiveCorrect,
			nextReviewAt,
			lastReviewedAt: now,
			isActive: true,
			updatedAt: now,
		};

		if (existingScheduling) {
			// Update existing record
			await db
				.update(cuecardScheduling)
				.set(schedulingData)
				.where(
					and(
						eq(cuecardScheduling.cardId, cardId),
						eq(cuecardScheduling.userId, userId)
					)
				);
			return {
				...existingScheduling,
				...schedulingData,
			};
		}

		// Insert new record
		const [newScheduling] = await db
			.insert(cuecardScheduling)
			.values({
				...schedulingData,
				createdAt: now,
			})
			.returning();
		return newScheduling;
	} catch (error) {
		logger.error(
			{
				err: error,
				action: "updateCuecardScheduling",
				cardId,
				userId,
				isCorrect,
				responseTime,
			},
			"Failed to update cuecard scheduling"
		);
		return null;
	}
}
