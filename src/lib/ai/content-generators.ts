/**
 * AI Content Generators
 * Core logic for generating educational content using AI models
 */

import { db } from "@/db";
import {
	conceptMaps as conceptMapsTable,
	cuecards as cuecardsTable,
	goldenNotes,
	multipleChoiceQuestions as mcqTable,
	openQuestions as openQuestionsTable,
	summaries as summariesTable,
} from "@/db/schema";
import type {
	ConceptMapsConfig,
	CuecardsConfig,
	GoldenNotesConfig,
	McqsConfig,
	OpenQuestionsConfig,
	SummariesConfig,
} from "@/types/generation-types";
import type { z } from "zod";
import type { ContentGenerationResult } from "./generation";
import {
	ConceptMapSchema,
	CuecardsArraySchema,
	GoldenNotesArraySchema,
	MCQsArraySchema,
	OpenQuestionsArraySchema,
	SummarySchema,
	generateContent,
} from "./generation";

// Insert functions for each content type
async function insertGoldenNotes(
	data: z.infer<typeof GoldenNotesArraySchema>,
	courseId: string,
	weekId: string
) {
	const notesToInsert = data.map((note) => ({
		courseId,
		weekId,
		title: note.title,
		content: note.content,
		priority: note.priority || 1,
		category: note.category || "general",
		metadata: {},
	}));
	if (notesToInsert.length > 0) {
		await db.insert(goldenNotes).values(notesToInsert);
	}
}

async function insertCuecards(
	data: z.infer<typeof CuecardsArraySchema>,
	courseId: string,
	weekId: string
) {
	const cuecardsToInsert = data.map((fc) => ({
		courseId,
		weekId,
		question: fc.question,
		answer: fc.answer,
		difficulty: fc.difficulty,
		metadata: {},
	}));
	if (cuecardsToInsert.length > 0) {
		await db.insert(cuecardsTable).values(cuecardsToInsert);
	}
}

async function insertMCQs(
	data: z.infer<typeof MCQsArraySchema>,
	courseId: string,
	weekId: string
) {
	const mcqsToInsert = data.map((q) => ({
		courseId,
		weekId,
		question: q.question,
		options: q.options,
		correctAnswer: q.correctAnswer,
		explanation: q.explanation,
		difficulty: q.difficulty,
		metadata: {},
	}));
	if (mcqsToInsert.length > 0) {
		await db.insert(mcqTable).values(mcqsToInsert);
	}
}

async function insertOpenQuestions(
	data: z.infer<typeof OpenQuestionsArraySchema>,
	courseId: string,
	weekId: string
) {
	const questionsToInsert = data.map((q) => ({
		courseId,
		weekId,
		question: q.question,
		sampleAnswer: q.sampleAnswer,
		gradingRubric: q.gradingRubric,
		difficulty: q.difficulty,
		metadata: {},
	}));
	if (questionsToInsert.length > 0) {
		await db.insert(openQuestionsTable).values(questionsToInsert);
	}
}

async function insertSummaries(
	data: z.infer<typeof SummarySchema>[],
	courseId: string,
	weekId: string
) {
	const summaryToInsert = data.map((s) => ({
		courseId,
		weekId,
		title: s.title,
		content: s.content,
		summaryType: s.summaryType,
		wordCount: s.wordCount,
		metadata: {},
	}));
	if (summaryToInsert.length > 0) {
		await db.insert(summariesTable).values(summaryToInsert);
	}
}

async function insertConceptMaps(
	data: z.infer<typeof ConceptMapSchema>[],
	courseId: string,
	weekId: string
) {
	const conceptMapsToInsert = data.map((cm) => ({
		courseId,
		weekId,
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
		await db.insert(conceptMapsTable).values(conceptMapsToInsert);
	}
}

export async function generateGoldenNotesForCourseWeek(
	courseId: string,
	weekId: string,
	materialIds: string[],
	config: GoldenNotesConfig
): Promise<ContentGenerationResult> {
	return generateContent({
		courseId,
		weekId,
		materialIds,
		config,
		contentType: "goldenNotes",
		schema: GoldenNotesArraySchema,
		insertFunction: insertGoldenNotes,
		responseType: "array",
	});
}

export async function generateCuecardsForWeek(
	courseId: string,
	weekId: string,
	materialIds: string[],
	config: CuecardsConfig
): Promise<ContentGenerationResult> {
	return generateContent({
		courseId,
		weekId,
		materialIds,
		config,
		contentType: "cuecards",
		schema: CuecardsArraySchema,
		insertFunction: insertCuecards,
		responseType: "array",
	});
}

export async function generateMCQsForWeek(
	courseId: string,
	weekId: string,
	materialIds: string[],
	config: McqsConfig
): Promise<ContentGenerationResult> {
	return generateContent({
		courseId,
		weekId,
		materialIds,
		config,
		contentType: "multipleChoice",
		schema: MCQsArraySchema,
		insertFunction: insertMCQs,
		responseType: "array",
	});
}

export async function generateOpenQuestionsForWeek(
	courseId: string,
	weekId: string,
	materialIds: string[],
	config: OpenQuestionsConfig
): Promise<ContentGenerationResult> {
	return generateContent({
		courseId,
		weekId,
		materialIds,
		config,
		contentType: "openQuestions",
		schema: OpenQuestionsArraySchema,
		insertFunction: insertOpenQuestions,
		responseType: "array",
	});
}

export async function generateSummariesForWeek(
	courseId: string,
	weekId: string,
	materialIds: string[],
	config: SummariesConfig
): Promise<ContentGenerationResult> {
	return generateContent({
		courseId,
		weekId,
		materialIds,
		config,
		contentType: "summaries",
		schema: SummarySchema,
		insertFunction: insertSummaries,
		responseType: "object",
	});
}

export async function generateConceptMapsForWeek(
	courseId: string,
	weekId: string,
	materialIds: string[],
	config: ConceptMapsConfig
): Promise<ContentGenerationResult> {
	return generateContent({
		courseId,
		weekId,
		materialIds,
		config,
		contentType: "conceptMaps",
		schema: ConceptMapSchema,
		insertFunction: insertConceptMaps,
		responseType: "object",
		maxTokens: 4000,
	});
}
