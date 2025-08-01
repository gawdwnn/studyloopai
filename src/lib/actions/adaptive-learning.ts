"use server";

import { db } from "@/db";
import { learningGaps, learningSessions, sessionResponses } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { and, eq } from "drizzle-orm";

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
		logger.error("Failed to create learning session", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			action: "createLearningSession",
			contentType: params.contentType,
			courseId: params.sessionConfig.courseId,
		});
		return null;
	}
}

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
		logger.error("Failed to create session responses", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			action: "createSessionResponses",
			sessionId,
			responseCount: responses.length,
		});
		return [];
	}
}

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
		logger.error("Failed to create or update learning gap", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			action: "createOrUpdateLearningGap",
			contentType: params.contentType,
			contentId: params.contentId,
		});
		return null;
	}
}
