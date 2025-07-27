import type * as schema from "@/db/schema";
import {
	courseMaterials,
	courseWeeks,
	cuecards,
	documentChunks,
	generationConfigs,
	goldenNotes,
	multipleChoiceQuestions,
	openQuestions,
	ownNotes,
	summaries,
} from "@/db/schema";
import { type ExtractTablesWithRelations, and, eq, inArray } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

type DbTransaction = PgTransaction<
	PostgresJsQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

export interface AiContentDeletionCounts {
	cuecards: number;
	mcqs: number;
	openQuestions: number;
	summaries: number;
	goldenNotes: number;
	total: number;
}

export interface ContentDeletionResult {
	configsDeleted: number;
	aiContentDeleted: AiContentDeletionCounts;
	chunksDeleted: number;
	ownNotesDeleted?: number;
}

/**
 * Delete all content for a course (for complete course deletion)
 * Includes AI content, materials, weeks, configs, and chunks
 */
export async function deleteContentForCourse(
	tx: DbTransaction,
	courseId: string,
	materialIds: string[]
): Promise<{
	aiContentDeleted: AiContentDeletionCounts;
	ownNotesDeleted: number;
	configsDeleted: number;
	chunksDeleted: number;
	materialsDeleted: number;
	weeksDeleted: number;
}> {
	const [
		cuecardsResult,
		mcqsResult,
		openQuestionsResult,
		summariesResult,
		goldenNotesResult,
		ownNotesResult,
		configsResult,
		chunksResult,
		materialsResult,
		weeksResult,
	] = await Promise.all([
		tx
			.delete(cuecards)
			.where(eq(cuecards.courseId, courseId))
			.returning({ id: cuecards.id }),
		tx
			.delete(multipleChoiceQuestions)
			.where(eq(multipleChoiceQuestions.courseId, courseId))
			.returning({ id: multipleChoiceQuestions.id }),
		tx
			.delete(openQuestions)
			.where(eq(openQuestions.courseId, courseId))
			.returning({ id: openQuestions.id }),
		tx
			.delete(summaries)
			.where(eq(summaries.courseId, courseId))
			.returning({ id: summaries.id }),
		tx
			.delete(goldenNotes)
			.where(eq(goldenNotes.courseId, courseId))
			.returning({ id: goldenNotes.id }),
		tx
			.delete(ownNotes)
			.where(eq(ownNotes.courseId, courseId))
			.returning({ id: ownNotes.id }),
		tx
			.delete(generationConfigs)
			.where(eq(generationConfigs.courseId, courseId))
			.returning({ id: generationConfigs.id }),
		materialIds.length > 0
			? tx
					.delete(documentChunks)
					.where(inArray(documentChunks.materialId, materialIds))
					.returning({ id: documentChunks.id })
			: Promise.resolve([]),
		materialIds.length > 0
			? tx
					.delete(courseMaterials)
					.where(eq(courseMaterials.courseId, courseId))
					.returning({ id: courseMaterials.id })
			: Promise.resolve([]),
		tx
			.delete(courseWeeks)
			.where(eq(courseWeeks.courseId, courseId))
			.returning({ id: courseWeeks.id }),
	]);

	const aiContentCounts = {
		cuecards: cuecardsResult.length,
		mcqs: mcqsResult.length,
		openQuestions: openQuestionsResult.length,
		summaries: summariesResult.length,
		goldenNotes: goldenNotesResult.length,
		ownNotes: ownNotesResult.length,
		total: 0,
	};

	aiContentCounts.total = Object.values(aiContentCounts)
		.filter((_, index) => index < 6) // Exclude 'total' field
		.reduce((sum, count) => sum + count, 0);

	return {
		aiContentDeleted: aiContentCounts,
		ownNotesDeleted: ownNotesResult.length,
		configsDeleted: configsResult.length,
		chunksDeleted: chunksResult.length,
		materialsDeleted: materialsResult.length,
		weeksDeleted: weeksResult.length,
	};
}

/**
 * Delete all content for a specific Course week
 * Includes:
 * - AI content (goldennotes, summaries, own notes, open questions, multiple choice questions, cuecards,
 * - Generation configs
 * - Material chunks)
 */
export async function deleteContentForCourseWeek(
	tx: DbTransaction,
	courseId: string,
	weekId: string,
	materialIds?: string[]
): Promise<{
	aiContentDeleted: AiContentDeletionCounts;
	ownNotesDeleted: number;
	configsDeleted: number;
	chunksDeleted: number;
}> {
	const [
		cuecardsResult,
		mcqsResult,
		openQuestionsResult,
		summariesResult,
		goldenNotesResult,
		ownNotesResult,
		configsResult,
		chunksResult,
	] = await Promise.all([
		tx
			.delete(cuecards)
			.where(and(eq(cuecards.courseId, courseId), eq(cuecards.weekId, weekId)))
			.returning({ id: cuecards.id }),
		tx
			.delete(multipleChoiceQuestions)
			.where(
				and(
					eq(multipleChoiceQuestions.courseId, courseId),
					eq(multipleChoiceQuestions.weekId, weekId)
				)
			)
			.returning({ id: multipleChoiceQuestions.id }),
		tx
			.delete(openQuestions)
			.where(
				and(
					eq(openQuestions.courseId, courseId),
					eq(openQuestions.weekId, weekId)
				)
			)
			.returning({ id: openQuestions.id }),
		tx
			.delete(summaries)
			.where(
				and(eq(summaries.courseId, courseId), eq(summaries.weekId, weekId))
			)
			.returning({ id: summaries.id }),
		tx
			.delete(goldenNotes)
			.where(
				and(eq(goldenNotes.courseId, courseId), eq(goldenNotes.weekId, weekId))
			)
			.returning({ id: goldenNotes.id }),
		tx
			.delete(ownNotes)
			.where(and(eq(ownNotes.courseId, courseId), eq(ownNotes.weekId, weekId)))
			.returning({ id: ownNotes.id }),
		tx
			.delete(generationConfigs)
			.where(
				and(
					eq(generationConfigs.courseId, courseId),
					eq(generationConfigs.weekId, weekId)
				)
			)
			.returning({ id: generationConfigs.id }),
		materialIds && materialIds.length > 0
			? tx
					.delete(documentChunks)
					.where(inArray(documentChunks.materialId, materialIds))
					.returning({ id: documentChunks.id })
			: Promise.resolve([]),
	]);

	const aiContentCounts = {
		cuecards: cuecardsResult.length,
		mcqs: mcqsResult.length,
		openQuestions: openQuestionsResult.length,
		summaries: summariesResult.length,
		goldenNotes: goldenNotesResult.length,
		total: 0,
	};

	aiContentCounts.total = Object.values(aiContentCounts)
		.filter((_, index) => index < 5) // Exclude 'total' field
		.reduce((sum, count) => sum + count, 0);

	return {
		aiContentDeleted: aiContentCounts,
		ownNotesDeleted: ownNotesResult.length,
		configsDeleted: configsResult.length,
		chunksDeleted: chunksResult.length,
	};
}
