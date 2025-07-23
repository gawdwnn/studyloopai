import { getAdminDatabaseAccess } from "@/db";
import type {
	ConceptMapSchema,
	CuecardsArraySchema,
	GoldenNotesArraySchema,
	MCQsArraySchema,
	OpenQuestionsArraySchema,
	SummarySchema,
} from "@/lib/ai/generation/schemas";
import type { z } from "zod";

/**
 * Content insertion functions using Supabase admin client for background jobs
 */

export async function insertGoldenNotes(
	data: z.infer<typeof GoldenNotesArraySchema>,
	courseId: string,
	weekId: string
): Promise<void> {
	const admin = getAdminDatabaseAccess();

	const notesToInsert = data.map((note) => ({
		course_id: courseId,
		week_id: weekId,
		title: note.title,
		content: note.content,
		priority: note.priority || 1,
		category: note.category || "general",
		metadata: {},
	}));

	if (notesToInsert.length > 0) {
		const { error } = await admin.from("golden_notes").insert(notesToInsert);

		if (error) {
			throw new Error(`Failed to insert golden notes: ${error.message}`);
		}
	}
}

export async function insertCuecards(
	data: z.infer<typeof CuecardsArraySchema>,
	courseId: string,
	weekId: string
): Promise<void> {
	const admin = getAdminDatabaseAccess();

	const cuecardsToInsert = data.map((fc) => ({
		course_id: courseId,
		week_id: weekId,
		question: fc.question,
		answer: fc.answer,
		difficulty: fc.difficulty,
		metadata: {},
	}));

	if (cuecardsToInsert.length > 0) {
		const { error } = await admin.from("cuecards").insert(cuecardsToInsert);

		if (error) {
			throw new Error(`Failed to insert cuecards: ${error.message}`);
		}
	}
}

export async function insertMCQs(
	data: z.infer<typeof MCQsArraySchema>,
	courseId: string,
	weekId: string
): Promise<void> {
	const admin = getAdminDatabaseAccess();

	const mcqsToInsert = data.map((q) => ({
		course_id: courseId,
		week_id: weekId,
		question: q.question,
		options: q.options,
		correct_answer: q.correctAnswer,
		explanation: q.explanation,
		difficulty: q.difficulty,
		metadata: {},
	}));

	if (mcqsToInsert.length > 0) {
		const { error } = await admin.from("MCQs").insert(mcqsToInsert);

		if (error) {
			throw new Error(`Failed to insert MCQs: ${error.message}`);
		}
	}
}

export async function insertOpenQuestions(
	data: z.infer<typeof OpenQuestionsArraySchema>,
	courseId: string,
	weekId: string
): Promise<void> {
	const admin = getAdminDatabaseAccess();

	const questionsToInsert = data.map((q) => ({
		course_id: courseId,
		week_id: weekId,
		question: q.question,
		sample_answer: q.sampleAnswer,
		grading_rubric: q.gradingRubric,
		difficulty: q.difficulty,
		metadata: {},
	}));

	if (questionsToInsert.length > 0) {
		const { error } = await admin
			.from("open_questions")
			.insert(questionsToInsert);

		if (error) {
			throw new Error(`Failed to insert open questions: ${error.message}`);
		}
	}
}

export async function insertSummaries(
	data: z.infer<typeof SummarySchema>[],
	courseId: string,
	weekId: string
): Promise<void> {
	const admin = getAdminDatabaseAccess();

	const summaryToInsert = data.map((s) => ({
		course_id: courseId,
		week_id: weekId,
		title: s.title,
		content: s.content,
		summary_type: s.summaryType,
		word_count: s.wordCount,
		metadata: {},
	}));

	if (summaryToInsert.length > 0) {
		const { error } = await admin.from("summaries").insert(summaryToInsert);

		if (error) {
			throw new Error(`Failed to insert summaries: ${error.message}`);
		}
	}
}

export async function insertConceptMaps(
	data: z.infer<typeof ConceptMapSchema>[],
	courseId: string,
	weekId: string
): Promise<void> {
	const admin = getAdminDatabaseAccess();

	const conceptMapsToInsert = data.map((cm) => ({
		course_id: courseId,
		week_id: weekId,
		title: cm.title,
		content: JSON.stringify(cm.content),
		style: cm.style,
		metadata: {
			nodeCount: cm.content.nodes.length,
			edgeCount: cm.content.edges.length,
			centralConcept: cm.content.metadata.central_concept,
		},
	}));

	if (conceptMapsToInsert.length > 0) {
		const { error } = await admin
			.from("concept_maps")
			.insert(conceptMapsToInsert);

		if (error) {
			throw new Error(`Failed to insert concept maps: ${error.message}`);
		}
	}
}
