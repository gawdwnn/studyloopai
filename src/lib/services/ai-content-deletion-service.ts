import type * as schema from "@/db/schema";
import {
	courseMaterials,
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
 * Delete all AI content for a course (for course deletion)
 */
export async function deleteAiContentForCourse(
	tx: DbTransaction,
	courseId: string
): Promise<{ aiContentDeleted: AiContentDeletionCounts; ownNotesDeleted: number }> {
	const [
		cuecardsResult,
		mcqsResult,
		openQuestionsResult,
		summariesResult,
		goldenNotesResult,
		ownNotesResult,
	] = await Promise.all([
		tx.delete(cuecards).where(eq(cuecards.courseId, courseId)).returning({ id: cuecards.id }),
		tx
			.delete(multipleChoiceQuestions)
			.where(eq(multipleChoiceQuestions.courseId, courseId))
			.returning({ id: multipleChoiceQuestions.id }),
		tx
			.delete(openQuestions)
			.where(eq(openQuestions.courseId, courseId))
			.returning({ id: openQuestions.id }),
		tx.delete(summaries).where(eq(summaries.courseId, courseId)).returning({ id: summaries.id }),
		tx
			.delete(goldenNotes)
			.where(eq(goldenNotes.courseId, courseId))
			.returning({ id: goldenNotes.id }),
		tx.delete(ownNotes).where(eq(ownNotes.courseId, courseId)).returning({ id: ownNotes.id }),
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
	};
}

/**
 * Delete AI content for a specific week (for course week material deletion)
 */
export async function deleteAiContentForCourseWeek(
	tx: DbTransaction,
	courseId: string,
	weekId: string
): Promise<{ aiContentDeleted: AiContentDeletionCounts; ownNotesDeleted: number }> {
	// Delete AI content and own notes, get actual counts from affected rows
	const [
		cuecardsResult,
		mcqsResult,
		openQuestionsResult,
		summariesResult,
		goldenNotesResult,
		ownNotesResult,
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
			.where(and(eq(openQuestions.courseId, courseId), eq(openQuestions.weekId, weekId)))
			.returning({ id: openQuestions.id }),
		tx
			.delete(summaries)
			.where(and(eq(summaries.courseId, courseId), eq(summaries.weekId, weekId)))
			.returning({ id: summaries.id }),
		tx
			.delete(goldenNotes)
			.where(and(eq(goldenNotes.courseId, courseId), eq(goldenNotes.weekId, weekId)))
			.returning({ id: goldenNotes.id }),
		tx
			.delete(ownNotes)
			.where(and(eq(ownNotes.courseId, courseId), eq(ownNotes.weekId, weekId)))
			.returning({ id: ownNotes.id }),
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
	};
}

/**
 * Delete material-specific data (configs and chunks) for given material IDs
 */
export async function deleteMaterialSpecificData(
	tx: DbTransaction,
	materialIds: string[]
): Promise<{
	configsDeleted: number;
	chunksDeleted: number;
}> {
	if (materialIds.length === 0) {
		return {
			configsDeleted: 0,
			chunksDeleted: 0,
		};
	}

	// Delete and get actual counts from affected rows
	const [configsResult, chunksResult] = await Promise.all([
		tx
			.delete(generationConfigs)
			.where(inArray(generationConfigs.materialId, materialIds))
			.returning({ id: generationConfigs.id }),
		tx
			.delete(documentChunks)
			.where(inArray(documentChunks.materialId, materialIds))
			.returning({ id: documentChunks.id }),
	]);

	return {
		configsDeleted: configsResult.length,
		chunksDeleted: chunksResult.length,
	};
}

/**
 * Delete AI content for a single material (gets courseId and weekId from materialId)
 */
export async function deleteAiContentForMaterial(
	tx: DbTransaction,
	materialId: string
): Promise<ContentDeletionResult> {
	// Get courseId and weekId from the material
	const material = await tx
		.select({
			courseId: courseMaterials.courseId,
			weekId: courseMaterials.weekId,
		})
		.from(courseMaterials)
		.where(eq(courseMaterials.id, materialId))
		.limit(1);

	if (!material[0]) {
		return {
			configsDeleted: 0,
			aiContentDeleted: {
				cuecards: 0,
				mcqs: 0,
				openQuestions: 0,
				summaries: 0,
				goldenNotes: 0,
				total: 0,
			},
			chunksDeleted: 0,
			ownNotesDeleted: 0,
		};
	}

	const { courseId, weekId } = material[0];

	// Delete AI content for this specific week (if weekId exists) - this includes own notes
	const aiContentResult = weekId
		? await deleteAiContentForCourseWeek(tx, courseId, weekId)
		: {
				aiContentDeleted: {
					cuecards: 0,
					mcqs: 0,
					openQuestions: 0,
					summaries: 0,
					goldenNotes: 0,
					total: 0,
				},
				ownNotesDeleted: 0,
			};

	// Delete material-specific data (configs and chunks)
	const materialResult = await deleteMaterialSpecificData(tx, [materialId]);

	return {
		configsDeleted: materialResult.configsDeleted,
		aiContentDeleted: aiContentResult.aiContentDeleted,
		chunksDeleted: materialResult.chunksDeleted,
		ownNotesDeleted: aiContentResult.ownNotesDeleted,
	};
}
