"use server";

import { db } from "@/db";
import {
	courseWeeks,
	cuecardScheduling,
	cuecards,
	learningGaps,
} from "@/db/schema";
import type { UserCuecard } from "@/lib/actions/cuecard";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { and, eq, inArray, isNull, lte } from "drizzle-orm";

interface SelectionConfig {
	courseId: string;
	weekIds?: string[];
	maxCards?: number;
	prioritizeGaps?: boolean;
	includeNewCards?: boolean;
}

interface SmartSessionResult {
	cards: UserCuecard[];
	metadata: {
		gapCards: number;
		reviewCards: number;
		newCards: number;
		totalAvailable: number;
		priority: "gaps" | "reviews" | "mixed" | "new";
	};
}

interface CardWithPriority extends UserCuecard {
	priority: number;
	reason: "gap" | "review" | "new";
	severity?: number;
	daysOverdue?: number;
}

/**
 * Smart card selection algorithm that prioritizes based on learning gaps, reviews, new cards.
 * Replaces randomization with intelligent priority-based selection.
 *
 * **STRICT ISOLATION GUARANTEE**: Only returns cards from the specified courseId and weekIds.
 * No cross-course or cross-week data leakage is possible.
 *
 * @param config - Selection configuration
 * @param config.courseId - Course ID to filter cards (REQUIRED - strict isolation)
 * @param config.weekIds - Optional array of week IDs to filter cards (strict isolation when provided)
 * @param config.maxCards - Maximum number of cards to return (default: 20)
 * @param config.prioritizeGaps - Whether to prioritize learning gap cards (default: true)
 * @param config.includeNewCards - Whether to include new cards (default: true)
 *
 * @returns Promise resolving to SmartSessionResult with prioritized cards and metadata
 *
 * @example
 * ```typescript
 * const result = await selectSmartCardSession({
 *   courseId: "course-123",
 *   weekIds: ["week-1", "week-2"],
 *   maxCards: 15,
 *   prioritizeGaps: true
 * });
 *
 * console.log(`Selected ${result.cards.length} cards`);
 * console.log(`Priority: ${result.metadata.priority}`);
 * ```
 */
export async function selectSmartCardSession(
	config: SelectionConfig
): Promise<SmartSessionResult> {
	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();
			if (!user) throw new Error("Authentication required");

			const maxCards = config.maxCards || 20;

			// Get all available cards
			const availableCards = await getAvailableCards(
				user.id,
				config.courseId,
				config.weekIds
			);

			if (availableCards.length === 0) {
				return {
					cards: [],
					metadata: {
						gapCards: 0,
						reviewCards: 0,
						newCards: 0,
						totalAvailable: 0,
						priority: "new",
					},
				};
			}

			// Get cards with different priority types
			const [gapCards, reviewCards, newCards] = await Promise.all([
				getCardsWithLearningGaps(user.id, config.courseId, config.weekIds),
				getDueReviewCards(user.id, config.courseId, config.weekIds),
				getNewCards(user.id, config.courseId, config.weekIds),
			]);

			// Assign priorities and create selection pool
			const prioritizedCards = assignCardPriorities(
				availableCards,
				gapCards,
				reviewCards,
				newCards
			);

			// Select cards based on priority algorithm
			const selectedCards = selectCardsByPriority(prioritizedCards, maxCards);

			// Generate metadata
			const metadata = generateSelectionMetadata(
				selectedCards,
				availableCards.length
			);

			return {
				cards: selectedCards.map(
					({ priority, reason, severity, daysOverdue, ...card }) => card
				),
				metadata,
			};
		},
		"selectSmartCardSession",
		{
			cards: [],
			metadata: {
				gapCards: 0,
				reviewCards: 0,
				newCards: 0,
				totalAvailable: 0,
				priority: "new",
			},
		}
	);
}

/**
 * Get all available cuecards for the given criteria with strict course/week isolation.
 *
 * **ISOLATION GUARANTEE**: Only returns cards matching the exact courseId and weekIds (if provided).
 *
 * @param userId - User ID (used for RLS validation, not filtering)
 * @param courseId - Course ID for strict filtering - NO cards from other courses
 * @param weekIds - Optional week IDs for strict filtering - NO cards from other weeks when provided
 *
 * @returns Promise resolving to array of UserCuecard objects
 *
 * @internal This function enforces strict data isolation at the database level
 */
async function getAvailableCards(
	_userId: string,
	courseId: string,
	weekIds?: string[]
): Promise<UserCuecard[]> {
	const conditions = [eq(cuecards.courseId, courseId)];

	if (weekIds && weekIds.length > 0) {
		conditions.push(inArray(cuecards.weekId, weekIds));
	}

	// Get cuecards with week information using joins
	const cuecardData = await db
		.select({
			id: cuecards.id,
			courseId: cuecards.courseId,
			weekId: cuecards.weekId,
			question: cuecards.question,
			answer: cuecards.answer,
			difficulty: cuecards.difficulty,
			metadata: cuecards.metadata,
			createdAt: cuecards.createdAt,
			updatedAt: cuecards.updatedAt,
			weekNumber: courseWeeks.weekNumber,
		})
		.from(cuecards)
		.leftJoin(courseWeeks, eq(cuecards.weekId, courseWeeks.id))
		.where(and(...conditions));

	// Transform to UserCuecard format
	return cuecardData.map((card) => ({
		...card,
		weekNumber: card.weekNumber || 0,
	}));
}

/**
 * Get cards that have active learning gaps (highest priority) with strict course/week isolation.
 *
 * Learning gaps represent areas where the user has struggled or performed poorly.
 * These cards receive the highest priority (190-1000 points) in the selection algorithm.
 *
 * **ISOLATION GUARANTEE**: Only returns gaps for cards in the specified courseId and weekIds.
 *
 * @param userId - User ID to filter learning gaps
 * @param courseId - Course ID for strict filtering - NO gaps from other courses
 * @param weekIds - Optional week IDs for strict filtering - NO gaps from other weeks when provided
 *
 * @returns Promise resolving to array of objects with cardId and severity (1-10 scale)
 *
 * @internal Implements two-step filtering: gaps by user, then cards by course/week
 */
async function getCardsWithLearningGaps(
	userId: string,
	courseId: string,
	weekIds?: string[]
): Promise<Array<{ cardId: string; severity: number }>> {
	const conditions = [
		eq(learningGaps.userId, userId),
		eq(learningGaps.contentType, "cuecard"),
		eq(learningGaps.isActive, true),
	];

	const gaps = await db.query.learningGaps.findMany({
		where: and(...conditions),
	});

	// Filter gaps by matching cuecards in the course/weeks
	const cardIds =
		weekIds && weekIds.length > 0
			? await db
					.select({ id: cuecards.id })
					.from(cuecards)
					.where(
						and(
							eq(cuecards.courseId, courseId),
							inArray(cuecards.weekId, weekIds)
						)
					)
			: await db
					.select({ id: cuecards.id })
					.from(cuecards)
					.where(eq(cuecards.courseId, courseId));

	const cardIdSet = new Set(cardIds.map((c) => c.id));

	return gaps
		.filter((gap) => cardIdSet.has(gap.contentId))
		.map((gap) => ({
			cardId: gap.contentId,
			severity: gap.severity,
		}));
}

/**
 * Get cards due for spaced repetition review (medium priority) with strict course/week isolation.
 *
 * Review cards are those scheduled for spaced repetition that are due or overdue.
 * These cards receive medium priority (50-99 points) in the selection algorithm.
 *
 * **ISOLATION GUARANTEE**: Only returns due cards from the specified courseId and weekIds.
 *
 * @param userId - User ID to filter scheduling records
 * @param courseId - Course ID for strict filtering - NO due cards from other courses
 * @param weekIds - Optional week IDs for strict filtering - NO due cards from other weeks when provided
 *
 * @returns Promise resolving to array of objects with cardId and daysOverdue count
 *
 * @internal Implements two-step filtering: scheduling by user/due date, then cards by course/week
 */
async function getDueReviewCards(
	userId: string,
	courseId: string,
	weekIds?: string[]
): Promise<Array<{ cardId: string; daysOverdue: number }>> {
	const now = new Date();

	const conditions = [
		eq(cuecardScheduling.userId, userId),
		lte(cuecardScheduling.nextReviewAt, now),
		eq(cuecardScheduling.isActive, true),
	];

	const dueCards = await db.query.cuecardScheduling.findMany({
		where: and(...conditions),
	});

	// Filter scheduling records by matching cuecards in the course/weeks
	const cardIds =
		weekIds && weekIds.length > 0
			? await db
					.select({ id: cuecards.id })
					.from(cuecards)
					.where(
						and(
							eq(cuecards.courseId, courseId),
							inArray(cuecards.weekId, weekIds)
						)
					)
			: await db
					.select({ id: cuecards.id })
					.from(cuecards)
					.where(eq(cuecards.courseId, courseId));

	const cardIdSet = new Set(cardIds.map((c) => c.id));

	return dueCards
		.filter((scheduling) => cardIdSet.has(scheduling.cardId))
		.map((scheduling) => {
			const daysOverdue = Math.floor(
				(now.getTime() - scheduling.nextReviewAt.getTime()) /
					(1000 * 60 * 60 * 24)
			);
			return {
				cardId: scheduling.cardId,
				daysOverdue: Math.max(0, daysOverdue),
			};
		});
}

/**
 * Get cards that have never been attempted (lowest priority) with strict course/week isolation.
 *
 * New cards are those with no scheduling records, meaning the user has never attempted them.
 * These cards receive the lowest priority (1-49 points) in the selection algorithm.
 *
 * **ISOLATION GUARANTEE**: Only returns new cards from the specified courseId and weekIds.
 *
 * @param userId - User ID to check for absence of scheduling records
 * @param courseId - Course ID for strict filtering - NO new cards from other courses
 * @param weekIds - Optional week IDs for strict filtering - NO new cards from other weeks when provided
 *
 * @returns Promise resolving to array of card IDs
 *
 * @internal Uses LEFT JOIN to find cards without scheduling records, with course/week filtering
 */
async function getNewCards(
	userId: string,
	courseId: string,
	weekIds?: string[]
): Promise<string[]> {
	const conditions = [eq(cuecards.courseId, courseId)];

	if (weekIds && weekIds.length > 0) {
		conditions.push(inArray(cuecards.weekId, weekIds));
	}

	// Get cards that have no scheduling record (never attempted)
	const newCards = await db
		.select({ id: cuecards.id })
		.from(cuecards)
		.leftJoin(
			cuecardScheduling,
			and(
				eq(cuecardScheduling.cardId, cuecards.id),
				eq(cuecardScheduling.userId, userId)
			)
		)
		.where(and(...conditions, isNull(cuecardScheduling.cardId)));

	return newCards.map((card) => card.id);
}

/**
 * Assign priority scores to cards based on learning data using a tiered priority system.
 *
 * Priority Tiers:
 * - Learning Gaps: 190-1000 points (highest priority, based on severity 1-10)
 * - Review Cards: 50-99 points (medium priority, based on days overdue)
 * - New Cards: 1-49 points (lowest priority, randomized within tier)
 *
 * @param availableCards - All available cards for the session (already filtered by course/week)
 * @param gapCards - Cards with learning gaps and their severity levels
 * @param reviewCards - Cards due for review and their overdue counts
 * @param newCards - Card IDs that have never been attempted
 *
 * @returns Array of cards with assigned priority scores and metadata
 *
 * @internal Pure function that operates on pre-filtered data
 */
function assignCardPriorities(
	availableCards: UserCuecard[],
	gapCards: Array<{ cardId: string; severity: number }>,
	reviewCards: Array<{ cardId: string; daysOverdue: number }>,
	newCards: string[]
): CardWithPriority[] {
	const gapMap = new Map(gapCards.map((g) => [g.cardId, g.severity]));
	const reviewMap = new Map(reviewCards.map((r) => [r.cardId, r.daysOverdue]));
	const newCardSet = new Set(newCards);

	return availableCards.map((card) => {
		let priority = 0;
		let reason: "gap" | "review" | "new" = "new";
		let severity: number | undefined;
		let daysOverdue: number | undefined;

		// Highest priority: Learning gaps (100-1000 range)
		if (gapMap.has(card.id)) {
			const gapSeverity = gapMap.get(card.id);
			if (gapSeverity !== undefined) {
				priority = 100 + gapSeverity * 90; // 190-1000
				reason = "gap";
				severity = gapSeverity;
			}
		}
		// Medium priority: Due reviews (50-99 range)
		else if (reviewMap.has(card.id)) {
			const overdue = reviewMap.get(card.id);
			if (overdue !== undefined) {
				priority = 50 + Math.min(overdue * 5, 49); // 50-99
				reason = "review";
				daysOverdue = overdue;
			}
		}
		// Lowest priority: New cards (1-49 range)
		else if (newCardSet.has(card.id)) {
			priority = Math.random() * 49 + 1; // 1-49, randomized
			reason = "new";
		}

		return {
			...card,
			priority,
			reason,
			severity,
			daysOverdue,
		};
	});
}

/**
 * Select cards based on priority scores with balanced distribution to prevent overwhelming users.
 *
 * Distribution Strategy:
 * - Maximum 40% learning gap cards (prevent frustration)
 * - Maximum 40% review cards (balance reinforcement)
 * - Remaining slots filled with new cards (ensure progress)
 *
 * @param prioritizedCards - Cards with assigned priority scores
 * @param maxCards - Maximum number of cards to select for the session
 *
 * @returns Array of selected cards with balanced distribution
 *
 * @internal Implements balanced selection to optimize learning outcomes
 */
function selectCardsByPriority(
	prioritizedCards: CardWithPriority[],
	maxCards: number
): CardWithPriority[] {
	// Sort by priority (highest first)
	const sortedCards = prioritizedCards.sort((a, b) => b.priority - a.priority);

	// Ensure balanced selection - don't overwhelm with only gaps
	const gapCards = sortedCards.filter((c) => c.reason === "gap");
	const reviewCards = sortedCards.filter((c) => c.reason === "review");
	const newCards = sortedCards.filter((c) => c.reason === "new");

	const selected: CardWithPriority[] = [];
	const maxGaps = Math.min(Math.ceil(maxCards * 0.4), gapCards.length); // Max 40% gaps
	const maxReviews = Math.min(Math.ceil(maxCards * 0.4), reviewCards.length); // Max 40% reviews

	// Add gap cards (highest priority)
	selected.push(...gapCards.slice(0, maxGaps));

	// Add review cards
	const remainingSlots = maxCards - selected.length;
	const reviewsToAdd = Math.min(maxReviews, remainingSlots);
	selected.push(...reviewCards.slice(0, reviewsToAdd));

	// Fill remaining slots with new cards
	const finalRemainingSlots = maxCards - selected.length;
	if (finalRemainingSlots > 0) {
		selected.push(...newCards.slice(0, finalRemainingSlots));
	}

	return selected;
}

/**
 * Generate metadata about the card selection for analytics and user feedback.
 *
 * Provides insights into:
 * - Distribution of card types (gaps, reviews, new)
 * - Overall session priority classification
 * - Total available cards count
 *
 * @param selectedCards - Final selected cards with priority information
 * @param totalAvailable - Total number of cards available for selection
 *
 * @returns Metadata object with selection statistics and priority classification
 *
 * @internal Pure function for generating session analytics
 */
function generateSelectionMetadata(
	selectedCards: CardWithPriority[],
	totalAvailable: number
): SmartSessionResult["metadata"] {
	const gapCards = selectedCards.filter((c) => c.reason === "gap").length;
	const reviewCards = selectedCards.filter((c) => c.reason === "review").length;
	const newCards = selectedCards.filter((c) => c.reason === "new").length;

	let priority: "gaps" | "reviews" | "mixed" | "new" = "mixed";
	if (gapCards > reviewCards && gapCards > newCards) priority = "gaps";
	else if (reviewCards > gapCards && reviewCards > newCards)
		priority = "reviews";
	else if (newCards > 0 && gapCards === 0 && reviewCards === 0)
		priority = "new";

	return {
		gapCards,
		reviewCards,
		newCards,
		totalAvailable,
		priority,
	};
}
