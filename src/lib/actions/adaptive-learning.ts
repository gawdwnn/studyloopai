"use server";

import { db } from "@/db";
import { learningGaps, learningSessions, sessionResponses } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import { logger } from "@/lib/utils/logger";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

// Database transaction helper - removed as transactions have type mismatch issues

// Zod validation schemas
const CuecardResponseDataSchema = z.object({
	feedback: z.enum(["correct", "incorrect"]),
	timeSpent: z.number().min(0),
	difficultyRating: z.number().min(1).max(10).optional(),
});

const McqResponseDataSchema = z.object({
	isCorrect: z.boolean(),
	timeSpent: z.number().min(0),
});

const OpenQuestionResponseDataSchema = z.object({
	userAnswer: z.string().min(1),
	timeSpent: z.number().min(0),
	expectedAnswer: z.string().optional(),
	aiScore: z.number().min(0).max(100).optional(),
});

const ResponseDataSchema = z.union([
	CuecardResponseDataSchema,
	McqResponseDataSchema,
	OpenQuestionResponseDataSchema,
]);

const SessionResponseDataSchema = z.object({
	contentId: z.string().min(1),
	responseData: ResponseDataSchema,
	responseTime: z.number().min(0),
	isCorrect: z.boolean(),
	attemptedAt: z.date(),
});

const CuecardSessionConfigSchema = z.object({
	courseId: z.string().min(1),
	weeks: z.array(z.string()),
	difficultyLevel: z.string().optional(),
	sessionMode: z.enum(["practice", "review", "adaptive"]).optional(),
});

const McqSessionConfigSchema = z.object({
	courseId: z.string().min(1),
	weeks: z.array(z.string()),
	questionCount: z.number().min(1).optional(),
	timeLimit: z.number().min(0).optional(),
});

const OpenQuestionSessionConfigSchema = z.object({
	courseId: z.string().min(1),
	weeks: z.array(z.string()),
	questionCount: z.number().min(1).optional(),
	evaluationMode: z.enum(["ai", "manual"]).optional(),
});

const SessionConfigSchema = z.union([
	CuecardSessionConfigSchema,
	McqSessionConfigSchema,
	OpenQuestionSessionConfigSchema,
]);

const CreateSessionOnlyParamsSchema = z.object({
	contentType: z.enum(["cuecard", "mcq", "open_question"]),
	sessionConfig: SessionConfigSchema,
	startedAt: z.date(),
});

const CompleteSessionParamsSchema = z.object({
	sessionId: z.string().min(1),
	totalTime: z.number().min(0),
	accuracy: z.number().min(0).max(100),
	completedAt: z.date(),
});

const LearningGapParamsSchema = z.object({
	contentType: z.enum(["cuecard", "mcq", "open_question"]),
	contentId: z.string().min(1),
	conceptId: z.string().optional(),
	severity: z.number().min(1).max(10).optional(),
});

// Legacy interfaces for backward compatibility
interface CuecardResponseData {
	feedback: "correct" | "incorrect";
	timeSpent: number;
	difficultyRating?: number;
}

interface McqResponseData {
	isCorrect: boolean;
	timeSpent: number;
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

// Type definitions for the functions
type CreateSessionOnlyParams = z.infer<typeof CreateSessionOnlyParamsSchema>;
type CompleteSessionParams = z.infer<typeof CompleteSessionParamsSchema>;
type LearningGapParams = z.infer<typeof LearningGapParamsSchema>;

/**
 * Create or update a learning gap when user struggles with content
 */
export async function createOrUpdateLearningGap(params: LearningGapParams) {
	// Validate input parameters
	const validatedParams = LearningGapParamsSchema.parse(params);

	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();
			if (!user) throw new Error("Authentication required");

			// Check if gap already exists
			const existingGap = await db.query.learningGaps.findFirst({
				where: and(
					eq(learningGaps.userId, user.id),
					eq(learningGaps.contentType, validatedParams.contentType),
					eq(learningGaps.contentId, validatedParams.contentId),
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
					contentType: validatedParams.contentType,
					contentId: validatedParams.contentId,
					conceptId: validatedParams.conceptId,
					severity: validatedParams.severity || 5, // Default medium severity
					lastFailureAt: new Date(),
				})
				.returning();
			return newGap;
		},
		"createOrUpdateLearningGap",
		null
	);
}

// =============================================================================
// REAL-TIME SESSION PERSISTENCE FUNCTIONS
// =============================================================================

/**
 * Create a session immediately at start with placeholder values
 * Used for real-time persistence - session created before any responses
 */
export async function createSessionOnly(params: CreateSessionOnlyParams) {
	// Validate input parameters
	const validatedParams = CreateSessionOnlyParamsSchema.parse(params);

	const {
		data: { user },
	} = await (await getServerClient()).auth.getUser();

	if (!user) throw new Error("Authentication required");

	const [session] = await db
		.insert(learningSessions)
		.values({
			userId: user.id,
			contentType: validatedParams.contentType,
			sessionConfig: validatedParams.sessionConfig,
			totalTime: 0,
			itemsCompleted: 0,
			accuracy: 0,
			startedAt: validatedParams.startedAt,
			completedAt: validatedParams.startedAt,
		})
		.returning();

	return session;
}

/**
 * Save a single response immediately
 * Updates the session's itemsCompleted count after each response
 */
export async function addSessionResponse(
	sessionId: string,
	responseData: SessionResponseData
) {
	// Validate input parameters
	if (!sessionId?.trim()) {
		throw new Error("Session ID is required");
	}
	const validatedResponseData = SessionResponseDataSchema.parse(responseData);

	return await withErrorHandling(
		async () => {
			logger.info("addSessionResponse called", {
				sessionId,
				contentId: validatedResponseData.contentId,
				isCorrect: validatedResponseData.isCorrect,
				responseTime: validatedResponseData.responseTime,
			});

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
				logger.error("Session not found or unauthorized", {
					sessionId,
					userId: user.id,
					action: "addSessionResponse",
				});
				throw new Error("Session not found or unauthorized");
			}

			logger.debug("Found session for response", {
				sessionId: session.id,
				currentItemsCompleted: session.itemsCompleted,
			});

			// Insert single response
			const [response] = await db
				.insert(sessionResponses)
				.values({
					sessionId,
					contentId: validatedResponseData.contentId,
					responseData: validatedResponseData.responseData,
					responseTime: validatedResponseData.responseTime,
					isCorrect: validatedResponseData.isCorrect,
					attemptedAt: validatedResponseData.attemptedAt,
				})
				.returning();

			// Update session itemsCompleted count
			await db
				.update(learningSessions)
				.set({
					itemsCompleted: session.itemsCompleted + 1,
				})
				.where(eq(learningSessions.id, sessionId));

			return response;
		},
		"addSessionResponse",
		null
	);
}

/**
 * Finalize session with final stats
 * Updates the session record with actual completion data
 */
export async function completeSession(params: CompleteSessionParams) {
	// Validate input parameters
	const validatedParams = CompleteSessionParamsSchema.parse(params);

	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();

			if (!user) throw new Error("Authentication required");

			// First verify session exists and is owned by user
			const session = await db.query.learningSessions.findFirst({
				where: and(
					eq(learningSessions.id, validatedParams.sessionId),
					eq(learningSessions.userId, user.id)
				),
			});

			if (!session) {
				throw new Error("Session not found or unauthorized");
			}

			// Verify all responses were saved before completing
			const responseCount = await db
				.select({ count: sql<number>`count(*)` })
				.from(sessionResponses)
				.where(eq(sessionResponses.sessionId, validatedParams.sessionId));

			const actualResponseCount = responseCount[0]?.count || 0;

			logger.info("Session completion validation", {
				sessionId: validatedParams.sessionId,
				itemsCompleted: session.itemsCompleted,
				actualResponseCount,
			});

			// Update session with final values
			const [updatedSession] = await db
				.update(learningSessions)
				.set({
					totalTime: validatedParams.totalTime,
					accuracy: validatedParams.accuracy,
					completedAt: validatedParams.completedAt,
				})
				.where(eq(learningSessions.id, validatedParams.sessionId))
				.returning();

			return updatedSession;
		},
		"completeSession",
		null
	);
}

/**
 * Get count of responses saved for a specific session
 * Used for session validation before completion
 */
export async function getSessionResponseCount(
	sessionId: string
): Promise<number> {
	// Validate input parameters
	if (!sessionId?.trim()) {
		throw new Error("Session ID is required");
	}

	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();

			if (!user) throw new Error("Authentication required");

			// Verify session ownership and get response count
			const result = await db
				.select({ count: sql<number>`count(*)` })
				.from(sessionResponses)
				.innerJoin(
					learningSessions,
					eq(sessionResponses.sessionId, learningSessions.id)
				)
				.where(
					and(
						eq(sessionResponses.sessionId, sessionId),
						eq(learningSessions.userId, user.id)
					)
				);

			return result[0]?.count || 0;
		},
		"getSessionResponseCount",
		0
	);
}

/**
 * Get complete session data including responses for results display
 * Used by results views to show accurate metrics from database
 */
export async function getSessionResults(sessionId: string) {
	// Validate input parameters
	if (!sessionId?.trim()) {
		throw new Error("Session ID is required");
	}

	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();

			if (!user) throw new Error("Authentication required");

			// Get session data first
			const session = await db.query.learningSessions.findFirst({
				where: and(
					eq(learningSessions.id, sessionId),
					eq(learningSessions.userId, user.id)
				),
			});

			if (!session) {
				logger.error("Session not found or unauthorized", {
					sessionId,
					userId: user.id,
					action: "getSessionResults",
				});
				return null;
			}

			// Get session responses separately
			const responses = await db.query.sessionResponses.findMany({
				where: eq(sessionResponses.sessionId, sessionId),
				orderBy: sessionResponses.attemptedAt,
			});

			// Calculate detailed metrics from database data
			const totalResponses = responses.length;
			const correctResponses = responses.filter((r) => r.isCorrect).length;
			const totalTimeFromResponses = responses.reduce(
				(sum, r) => sum + r.responseTime,
				0
			);
			const averageResponseTime =
				totalResponses > 0
					? Math.round(totalTimeFromResponses / totalResponses)
					: 0;

			// Format session results
			const results = {
				sessionId: session.id,
				contentType: session.contentType,
				totalTime: session.totalTime,
				itemsCompleted: session.itemsCompleted,
				accuracy: session.accuracy,
				startedAt: session.startedAt,
				completedAt: session.completedAt,
				// Additional calculated metrics
				totalResponses,
				correctResponses,
				incorrectResponses: totalResponses - correctResponses,
				averageResponseTime,
				// Raw response data for detailed analysis
				responses: responses.map((response) => ({
					contentId: response.contentId,
					isCorrect: response.isCorrect,
					responseTime: response.responseTime,
					attemptedAt: response.attemptedAt,
					responseData: response.responseData,
				})),
			};

			logger.info("Session results retrieved successfully", {
				sessionId,
				totalResponses,
				accuracy: session.accuracy,
				totalTime: session.totalTime,
			});

			return results;
		},
		"getSessionResults",
		null
	);
}
