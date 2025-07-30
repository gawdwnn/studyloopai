"use server";

import { db } from "@/db";
import { learningGaps, learningSessions, sessionResponses } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { and, desc, eq, sql } from "drizzle-orm";

// ============================================================================
// LEARNING SESSION MANAGEMENT
// ============================================================================

interface CuecardSessionConfig {
	courseId: string;
	weeks: string[];
	difficultyLevel?: string;
	sessionMode?: "practice" | "review" | "adaptive";
}

interface McqSessionConfig {
	courseId: string;
	weeks: string[];
	questionCount?: number;
	timeLimit?: number;
}

interface OpenQuestionSessionConfig {
	courseId: string;
	weeks: string[];
	questionCount?: number;
	evaluationMode?: "ai" | "manual";
}

type SessionConfig =
	| CuecardSessionConfig
	| McqSessionConfig
	| OpenQuestionSessionConfig;

interface CreateLearningSessionParams {
	contentType: "cuecard" | "mcq" | "open_question";
	sessionConfig: SessionConfig;
	totalTime: number;
	itemsCompleted: number;
	accuracy: number;
	startedAt: Date;
	completedAt: Date;
}

/**
 * Create a new learning session record
 * Called at the end of any learning session (cuecards, MCQs, open questions)
 */
export async function createLearningSession(
	params: CreateLearningSessionParams
) {
	try {
		const {
			data: { user },
		} = await (await getServerClient()).auth.getUser();

		if (!user) throw new Error("Authentication required");

		const [session] = await db
			.insert(learningSessions)
			.values({
				userId: user.id,
				contentType: params.contentType,
				sessionConfig: params.sessionConfig,
				totalTime: params.totalTime,
				itemsCompleted: params.itemsCompleted,
				accuracy: params.accuracy,
				startedAt: params.startedAt,
				completedAt: params.completedAt,
			})
			.returning();
		return session;
	} catch (error) {
		console.error("💥 createLearningSession failed:", error);
		return null;
	}
}

// ============================================================================
// SESSION RESPONSE TRACKING
// ============================================================================

interface CuecardResponseData {
	feedback: "correct" | "incorrect";
	timeSpent: number;
	difficultyRating?: number;
}

interface McqResponseData {
	selectedOption: string;
	timeSpent: number;
	allOptions: string[];
	correctOption: string;
}

interface OpenQuestionResponseData {
	userAnswer: string;
	timeSpent: number;
	expectedAnswer?: string;
	aiScore?: number;
}

type ResponseData =
	| CuecardResponseData
	| McqResponseData
	| OpenQuestionResponseData;

interface SessionResponseData {
	contentId: string;
	responseData: ResponseData;
	responseTime: number;
	isCorrect: boolean;
	attemptedAt: Date;
}

/**
 * Create session responses for a completed session
 * Batch inserts all responses for a session
 */
export async function createSessionResponses(
	sessionId: string,
	responses: SessionResponseData[]
) {
	try {
		const {
			data: { user },
		} = await (await getServerClient()).auth.getUser();
		if (!user) throw new Error("Authentication required");

		// Verify session ownership
		const session = await db.query.learningSessions.findFirst({
			where: and(
				eq(learningSessions.id, sessionId),
				eq(learningSessions.userId, user.id)
			),
		});

		if (!session) {
			throw new Error("Session not found or unauthorized");
		}

		const insertedResponses = await db
			.insert(sessionResponses)
			.values(
				responses.map((response) => ({
					sessionId,
					contentId: response.contentId,
					responseData: response.responseData,
					responseTime: response.responseTime,
					isCorrect: response.isCorrect,
					attemptedAt: response.attemptedAt,
				}))
			)
			.returning();
		return insertedResponses;
	} catch (error) {
		console.error("💥 createSessionResponses failed:", error);
		return [];
	}
}

// ============================================================================
// LEARNING GAP DETECTION
// ============================================================================

interface LearningGapParams {
	contentType: "cuecard" | "mcq" | "open_question";
	contentId: string;
	conceptId?: string;
	severity?: number;
}

/**
 * Create or update a learning gap when user struggles with content
 */
export async function createOrUpdateLearningGap(params: LearningGapParams) {
	try {
		const {
			data: { user },
		} = await (await getServerClient()).auth.getUser();
		if (!user) throw new Error("Authentication required");

		// Check if gap already exists
		const existingGap = await db.query.learningGaps.findFirst({
			where: and(
				eq(learningGaps.userId, user.id),
				eq(learningGaps.contentType, params.contentType),
				eq(learningGaps.contentId, params.contentId),
				eq(learningGaps.isActive, true)
			),
		});

		if (existingGap) {
			// Update existing gap
			const [updatedGap] = await db
				.update(learningGaps)
				.set({
					failureCount: existingGap.failureCount + 1,
					severity: Math.min(10, existingGap.severity + 1), // Increase severity, max 10
					lastFailureAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(learningGaps.id, existingGap.id))
				.returning();
			return updatedGap;
		}
		// Create new gap
		const [newGap] = await db
			.insert(learningGaps)
			.values({
				userId: user.id,
				contentType: params.contentType,
				contentId: params.contentId,
				conceptId: params.conceptId,
				severity: params.severity || 5, // Default medium severity
				lastFailureAt: new Date(),
			})
			.returning();
		return newGap;
	} catch (error) {
		console.error("💥 createOrUpdateLearningGap failed:", error);
		return null;
	}
}

/**
 * Mark a learning gap as recovered when user demonstrates mastery
 */
export async function recoverLearningGap(
	contentType: string,
	contentId: string
) {
	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();
			if (!user) throw new Error("Authentication required");

			const [recoveredGap] = await db
				.update(learningGaps)
				.set({
					isActive: false,
					recoveredAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(learningGaps.userId, user.id),
						eq(learningGaps.contentType, contentType),
						eq(learningGaps.contentId, contentId),
						eq(learningGaps.isActive, true)
					)
				)
				.returning();

			return recoveredGap;
		},
		"recoverLearningGap",
		null
	);
}

// ============================================================================
// USER SESSION ANALYTICS
// ============================================================================

/**
 * Get user's learning session count for AI recommendation threshold
 */
export async function getUserSessionCount(userId?: string) {
	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();
			const targetUserId = userId || user?.id;

			if (!targetUserId) throw new Error("User ID required");

			const result = await db
				.select({ count: sql<number>`count(*)` })
				.from(learningSessions)
				.where(eq(learningSessions.userId, targetUserId));

			return result[0]?.count || 0;
		},
		"getUserSessionCount",
		0
	);
}

/**
 * Get user's recent learning sessions with statistics
 */
export async function getUserLearningSessions(
	limit = 10,
	contentType?: "cuecard" | "mcq" | "open_question"
) {
	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();
			if (!user) throw new Error("Authentication required");

			const conditions = [eq(learningSessions.userId, user.id)];
			if (contentType) {
				conditions.push(eq(learningSessions.contentType, contentType));
			}

			const sessions = await db.query.learningSessions.findMany({
				where: and(...conditions),
				orderBy: [desc(learningSessions.completedAt)],
				limit,
			});

			return sessions;
		},
		"getUserLearningSessions",
		[]
	);
}

/**
 * Get user's active learning gaps
 */
export async function getUserLearningGaps() {
	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();
			if (!user) throw new Error("Authentication required");

			const gaps = await db.query.learningGaps.findMany({
				where: and(
					eq(learningGaps.userId, user.id),
					eq(learningGaps.isActive, true)
				),
				orderBy: [
					desc(learningGaps.severity),
					desc(learningGaps.lastFailureAt),
				],
			});

			return gaps;
		},
		"getUserLearningGaps",
		[]
	);
}
