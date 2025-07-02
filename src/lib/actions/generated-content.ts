"use server";

import { db } from "@/db";
import {
	flashcards,
	goldenNotes,
	multipleChoiceQuestions,
	openQuestions,
	summaries,
	userProgress,
} from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { and, count, eq } from "drizzle-orm";

/**
 * Get flashcards for a material
 */
export async function getFlashcardsByMaterial(materialId: string) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		const result = await db
			.select()
			.from(flashcards)
			.where(eq(flashcards.materialId, materialId))
			.orderBy(flashcards.createdAt);

		return { success: true, data: result };
	} catch (error) {
		console.error("Failed to fetch flashcards:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get multiple choice questions for a material
 */
export async function getMCQsByMaterial(materialId: string) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		const result = await db
			.select()
			.from(multipleChoiceQuestions)
			.where(eq(multipleChoiceQuestions.materialId, materialId))
			.orderBy(multipleChoiceQuestions.createdAt);

		return { success: true, data: result };
	} catch (error) {
		console.error("Failed to fetch MCQs:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get open questions for a material
 */
export async function getOpenQuestionsByMaterial(materialId: string) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		const result = await db
			.select()
			.from(openQuestions)
			.where(eq(openQuestions.materialId, materialId))
			.orderBy(openQuestions.createdAt);

		return { success: true, data: result };
	} catch (error) {
		console.error("Failed to fetch open questions:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get summaries for a material
 */
export async function getSummariesByMaterial(materialId: string) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		const result = await db
			.select()
			.from(summaries)
			.where(eq(summaries.materialId, materialId))
			.orderBy(summaries.createdAt);

		return { success: true, data: result };
	} catch (error) {
		console.error("Failed to fetch summaries:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get golden notes for a material
 */
export async function getGoldenNotesByMaterial(materialId: string) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		const result = await db
			.select()
			.from(goldenNotes)
			.where(eq(goldenNotes.materialId, materialId))
			.orderBy(goldenNotes.priority, goldenNotes.createdAt);

		return { success: true, data: result };
	} catch (error) {
		console.error("Failed to fetch golden notes:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Update user progress for content
 */
export async function updateUserProgress(
	contentType: "flashcard" | "mcq" | "open_question",
	contentId: string,
	status: "not_started" | "in_progress" | "completed",
	score?: number
) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		const progressData = {
			userId: user.id,
			contentType,
			contentId,
			status,
			score,
			attempts: 1,
			lastAttemptAt: new Date(),
			updatedAt: new Date(),
		};

		// Try to update existing progress, insert if not exists
		const existingProgress = await db
			.select()
			.from(userProgress)
			.where(
				and(
					eq(userProgress.userId, user.id),
					eq(userProgress.contentType, contentType),
					eq(userProgress.contentId, contentId)
				)
			)
			.limit(1);

		const existing = existingProgress[0];
		if (existing) {
			// Update existing progress
			await db
				.update(userProgress)
				.set({
					status,
					score,
					attempts: (existing.attempts ?? 0) + 1,
					lastAttemptAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(userProgress.id, existing.id));
		} else {
			// Insert new progress
			await db.insert(userProgress).values(progressData);
		}

		return { success: true };
	} catch (error) {
		console.error("Failed to update user progress:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get user progress for a material
 */
export async function getUserProgressByMaterial(materialId: string) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		// Get progress for flashcards
		const flashcardProgress = await db
			.select({
				contentId: userProgress.contentId,
				status: userProgress.status,
				score: userProgress.score,
				attempts: userProgress.attempts,
				lastAttemptAt: userProgress.lastAttemptAt,
			})
			.from(userProgress)
			.innerJoin(flashcards, eq(userProgress.contentId, flashcards.id))
			.where(
				and(
					eq(userProgress.userId, user.id),
					eq(userProgress.contentType, "flashcard"),
					eq(flashcards.materialId, materialId)
				)
			);

		// Get progress for MCQs
		const mcqProgress = await db
			.select({
				contentId: userProgress.contentId,
				status: userProgress.status,
				score: userProgress.score,
				attempts: userProgress.attempts,
				lastAttemptAt: userProgress.lastAttemptAt,
			})
			.from(userProgress)
			.innerJoin(multipleChoiceQuestions, eq(userProgress.contentId, multipleChoiceQuestions.id))
			.where(
				and(
					eq(userProgress.userId, user.id),
					eq(userProgress.contentType, "mcq"),
					eq(multipleChoiceQuestions.materialId, materialId)
				)
			);

		// Get progress for open questions
		const openQuestionProgress = await db
			.select({
				contentId: userProgress.contentId,
				status: userProgress.status,
				score: userProgress.score,
				attempts: userProgress.attempts,
				lastAttemptAt: userProgress.lastAttemptAt,
			})
			.from(userProgress)
			.innerJoin(openQuestions, eq(userProgress.contentId, openQuestions.id))
			.where(
				and(
					eq(userProgress.userId, user.id),
					eq(userProgress.contentType, "open_question"),
					eq(openQuestions.materialId, materialId)
				)
			);

		return {
			success: true,
			data: {
				flashcards: flashcardProgress,
				mcqs: mcqProgress,
				openQuestions: openQuestionProgress,
			},
		};
	} catch (error) {
		console.error("Failed to fetch user progress:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get content statistics for a material
 */
export async function getContentStatsByMaterial(materialId: string) {
	try {
		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Authentication required");
		}

		// Get counts for each content type
		const flashcardCount = await db
			.select({ count: count() })
			.from(flashcards)
			.where(eq(flashcards.materialId, materialId));

		const mcqCount = await db
			.select({ count: count() })
			.from(multipleChoiceQuestions)
			.where(eq(multipleChoiceQuestions.materialId, materialId));

		const openQuestionCount = await db
			.select({ count: count() })
			.from(openQuestions)
			.where(eq(openQuestions.materialId, materialId));

		const summaryCount = await db
			.select({ count: count() })
			.from(summaries)
			.where(eq(summaries.materialId, materialId));

		const goldenNoteCount = await db
			.select({ count: count() })
			.from(goldenNotes)
			.where(eq(goldenNotes.materialId, materialId));

		return {
			success: true,
			data: {
				flashcards: flashcardCount[0]?.count || 0,
				mcqs: mcqCount[0]?.count || 0,
				openQuestions: openQuestionCount[0]?.count || 0,
				summaries: summaryCount[0]?.count || 0,
				goldenNotes: goldenNoteCount[0]?.count || 0,
			},
		};
	} catch (error) {
		console.error("Failed to fetch content statistics:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
