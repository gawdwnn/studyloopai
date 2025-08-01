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

/**
 * Update feature counts for background jobs using admin access
 */
async function updateFeatureCountsAdmin(
	courseId: string,
	weekId: string,
	featureType: string,
	count: number
): Promise<void> {
	const admin = getAdminDatabaseAccess();
	const now = new Date();
	const updateData: Record<string, unknown> = { updated_at: now };

	// Set feature-specific fields
	switch (featureType) {
		case "cuecards":
			updateData.cuecards_generated = true;
			updateData.cuecards_count = count;
			updateData.cuecards_generated_at = now;
			break;
		case "mcqs":
			updateData.mcqs_generated = true;
			updateData.mcqs_count = count;
			updateData.mcqs_generated_at = now;
			break;
		case "openQuestions":
			updateData.open_questions_generated = true;
			updateData.open_questions_count = count;
			updateData.open_questions_generated_at = now;
			break;
		case "goldenNotes":
			updateData.golden_notes_generated = true;
			updateData.golden_notes_count = count;
			updateData.golden_notes_generated_at = now;
			break;
		case "summaries":
			updateData.summaries_generated = true;
			updateData.summaries_count = count;
			updateData.summaries_generated_at = now;
			break;
		case "conceptMaps":
			updateData.concept_maps_generated = true;
			updateData.concept_maps_count = count;
			updateData.concept_maps_generated_at = now;
			break;
		default:
			throw new Error(`Unknown feature type: ${featureType}`);
	}

	const { error } = await admin
		.from("course_week_features")
		.update(updateData)
		.eq("course_id", courseId)
		.eq("week_id", weekId);

	if (error) {
		throw new Error(`Failed to update feature counts: ${error.message}`);
	}
}

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

		// Update feature tracking
		await updateFeatureCountsAdmin(
			courseId,
			weekId,
			"goldenNotes",
			notesToInsert.length
		);
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

		// Update feature tracking
		await updateFeatureCountsAdmin(
			courseId,
			weekId,
			"cuecards",
			cuecardsToInsert.length
		);
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

		// Update feature tracking
		await updateFeatureCountsAdmin(
			courseId,
			weekId,
			"mcqs",
			mcqsToInsert.length
		);
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

		// Update feature tracking
		await updateFeatureCountsAdmin(
			courseId,
			weekId,
			"openQuestions",
			questionsToInsert.length
		);
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

		// Update feature tracking
		await updateFeatureCountsAdmin(
			courseId,
			weekId,
			"summaries",
			summaryToInsert.length
		);
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

		// Update feature tracking
		await updateFeatureCountsAdmin(
			courseId,
			weekId,
			"conceptMaps",
			conceptMapsToInsert.length
		);
	}
}
