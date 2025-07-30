"use server";

import { db } from "@/db";
import {
	cuecardScheduling,
	cuecards,
	learningGaps,
	learningSessions,
	multipleChoiceQuestions,
	openQuestions,
	sessionResponses,
} from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import type { SessionAnalytics } from "@/types/session-analytics";
import { and, desc, eq, inArray } from "drizzle-orm";

/**
 * Get session responses based on content type
 */
async function getSessionResponses(sessionId: string, contentType: string) {
	const baseResponseQuery = db
		.select({
			contentId: sessionResponses.contentId,
			responseData: sessionResponses.responseData,
			timeSpent: sessionResponses.responseTime,
			attemptedAt: sessionResponses.attemptedAt,
			isCorrect: sessionResponses.isCorrect,
		})
		.from(sessionResponses)
		.where(eq(sessionResponses.sessionId, sessionId))
		.orderBy(sessionResponses.attemptedAt);

	const responses = await baseResponseQuery;

	// Get question content based on content type
	const contentIds = responses.map((r) => r.contentId);
	if (contentIds.length === 0) return [];

	let questionData: Record<string, string> = {};

	switch (contentType) {
		case "cuecard": {
			const cuecardQuestions = await db
				.select({
					id: cuecards.id,
					question: cuecards.question,
				})
				.from(cuecards)
				.where(inArray(cuecards.id, contentIds));

			questionData = Object.fromEntries(
				cuecardQuestions.map((q) => [q.id, q.question])
			);
			break;
		}
		case "mcq": {
			const mcqQuestions = await db
				.select({
					id: multipleChoiceQuestions.id,
					question: multipleChoiceQuestions.question,
				})
				.from(multipleChoiceQuestions)
				.where(inArray(multipleChoiceQuestions.id, contentIds));

			questionData = Object.fromEntries(
				mcqQuestions.map((q) => [q.id, q.question])
			);
			break;
		}
		case "open_question": {
			const openQuestionData = await db
				.select({
					id: openQuestions.id,
					question: openQuestions.question,
				})
				.from(openQuestions)
				.where(inArray(openQuestions.id, contentIds));

			questionData = Object.fromEntries(
				openQuestionData.map((q) => [q.id, q.question])
			);
			break;
		}
	}

	return responses.map((r) => ({
		contentId: r.contentId,
		contentType: contentType as "cuecard" | "mcq" | "open_question",
		feedback: r.isCorrect
			? "correct"
			: ("incorrect" as "correct" | "incorrect"),
		timeSpent: r.timeSpent,
		attemptedAt: r.attemptedAt,
		question: questionData[r.contentId] || "Unknown question",
		responseData: r.responseData,
	}));
}

/**
 * Get learning gaps for specific content type
 */
async function getSessionLearningGaps(userId: string, contentType: string) {
	const gaps = await db
		.select({
			contentId: learningGaps.contentId,
			severity: learningGaps.severity,
			failureCount: learningGaps.failureCount,
		})
		.from(learningGaps)
		.where(
			and(
				eq(learningGaps.userId, userId),
				eq(learningGaps.contentType, contentType),
				eq(learningGaps.isActive, true)
			)
		);

	if (gaps.length === 0) return [];

	// Get content questions based on type
	const contentIds = gaps.map((g) => g.contentId);
	let questionData: Record<string, string> = {};

	switch (contentType) {
		case "cuecard": {
			const cuecardQuestions = await db
				.select({
					id: cuecards.id,
					question: cuecards.question,
				})
				.from(cuecards)
				.where(inArray(cuecards.id, contentIds));

			questionData = Object.fromEntries(
				cuecardQuestions.map((q) => [q.id, q.question])
			);
			break;
		}
		case "mcq": {
			const mcqQuestions = await db
				.select({
					id: multipleChoiceQuestions.id,
					question: multipleChoiceQuestions.question,
				})
				.from(multipleChoiceQuestions)
				.where(inArray(multipleChoiceQuestions.id, contentIds));

			questionData = Object.fromEntries(
				mcqQuestions.map((q) => [q.id, q.question])
			);
			break;
		}
		case "open_question": {
			const openQuestionData = await db
				.select({
					id: openQuestions.id,
					question: openQuestions.question,
				})
				.from(openQuestions)
				.where(inArray(openQuestions.id, contentIds));

			questionData = Object.fromEntries(
				openQuestionData.map((q) => [q.id, q.question])
			);
			break;
		}
	}

	return gaps.map((g) => ({
		contentId: g.contentId,
		contentType: contentType as "cuecard" | "mcq" | "open_question",
		severity: g.severity,
		failureCount: g.failureCount,
		question: questionData[g.contentId] || "Unknown question",
	}));
}

/**
 * Get cuecard scheduling data (cuecards only)
 */
async function getCuecardSchedulingData(userId: string, cardIds: string[]) {
	if (cardIds.length === 0) return [];

	const scheduling = await db
		.select({
			cardId: cuecardScheduling.cardId,
			nextReviewAt: cuecardScheduling.nextReviewAt,
			intervalDays: cuecardScheduling.intervalDays,
			easeFactor: cuecardScheduling.easeFactor,
			consecutiveCorrect: cuecardScheduling.consecutiveCorrect,
		})
		.from(cuecardScheduling)
		.where(
			and(
				eq(cuecardScheduling.userId, userId),
				inArray(cuecardScheduling.cardId, cardIds)
			)
		);

	// Get card questions
	const cuecardQuestions = await db
		.select({
			id: cuecards.id,
			question: cuecards.question,
		})
		.from(cuecards)
		.where(inArray(cuecards.id, cardIds));

	const questionData = Object.fromEntries(
		cuecardQuestions.map((q) => [q.id, q.question])
	);

	return scheduling.map((s) => ({
		contentId: s.cardId,
		contentType: "cuecard" as const,
		nextReviewAt: s.nextReviewAt,
		intervalDays: s.intervalDays,
		easeFactor: s.easeFactor,
		consecutiveCorrect: s.consecutiveCorrect,
		question: questionData[s.cardId] || "Unknown question",
	}));
}

/**
 * Get comprehensive analytics for a completed session
 */
export async function getSessionAnalytics(
	sessionId: string
): Promise<SessionAnalytics | null> {
	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();
			if (!user) throw new Error("Authentication required");

			// Get session data
			const session = await db.query.learningSessions.findFirst({
				where: and(
					eq(learningSessions.id, sessionId),
					eq(learningSessions.userId, user.id)
				),
			});

			if (!session) return null;

			// Get responses based on content type
			const responses = await getSessionResponses(
				sessionId,
				session.contentType
			);

			// Get learning gaps for this content type
			const gaps = await getSessionLearningGaps(user.id, session.contentType);

			// Get scheduling data (only for cuecards currently)
			const contentIds = responses.map((r) => r.contentId);
			const scheduling =
				session.contentType === "cuecard"
					? await getCuecardSchedulingData(user.id, contentIds)
					: []; // TODO: Implement scheduling for MCQs and open questions

			// Calculate performance metrics
			const avgResponseTime =
				responses.length > 0
					? responses.reduce((sum, r) => sum + r.timeSpent, 0) /
						responses.length
					: 0;

			const accuracyTrend =
				responses.length > 0
					? (responses.filter((r) => r.feedback === "correct").length /
							responses.length) *
						100
					: 0;

			// Difficulty distribution based on response time
			const difficultyDistribution = responses.reduce(
				(acc, r) => {
					const difficulty =
						r.timeSpent > 10000
							? "hard"
							: r.timeSpent > 5000
								? "medium"
								: "easy";
					acc[difficulty] = (acc[difficulty] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

			return {
				session: {
					id: session.id,
					totalTime: session.totalTime,
					itemsCompleted: session.itemsCompleted,
					accuracy: session.accuracy,
					startedAt: session.startedAt,
					completedAt: session.completedAt,
					contentType: session.contentType as
						| "cuecard"
						| "mcq"
						| "open_question",
				},
				responses,
				learningGaps: gaps,
				schedulingData: scheduling,
				performanceMetrics: {
					averageResponseTime: avgResponseTime,
					accuracyTrend: accuracyTrend,
					difficultyDistribution: difficultyDistribution,
					improvementRate: 0, // TODO: Calculate based on historical data
				},
			};
		},
		"getSessionAnalytics",
		null
	);
}

export interface SessionSummary {
	id: string;
	contentType: "cuecard" | "mcq" | "open_question";
	accuracy: number;
	itemsCompleted: number;
	totalTime: number;
	startedAt: Date;
	completedAt: Date | null;
	isCompleted: boolean;
}

/**
 * Get user's recent learning session history for navigation and trend analysis
 */
export async function getRecentSessionHistory(
	limit = 20
): Promise<SessionSummary[]> {
	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();
			if (!user) throw new Error("Authentication required");

			const sessions = await db
				.select({
					id: learningSessions.id,
					contentType: learningSessions.contentType,
					accuracy: learningSessions.accuracy,
					itemsCompleted: learningSessions.itemsCompleted,
					totalTime: learningSessions.totalTime,
					startedAt: learningSessions.startedAt,
					completedAt: learningSessions.completedAt,
				})
				.from(learningSessions)
				.where(eq(learningSessions.userId, user.id))
				.orderBy(desc(learningSessions.startedAt))
				.limit(limit);

			return sessions.map((session) => ({
				id: session.id,
				contentType: session.contentType as "cuecard" | "mcq" | "open_question",
				accuracy: session.accuracy,
				itemsCompleted: session.itemsCompleted,
				totalTime: session.totalTime,
				startedAt: session.startedAt,
				completedAt: session.completedAt,
				isCompleted: session.completedAt !== null,
			}));
		},
		"getRecentSessionHistory",
		[]
	);
}
