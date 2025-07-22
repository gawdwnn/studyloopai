/**
 * AI Content Generators
 * Core logic for generating educational content using AI models
 */

import type { DatabaseClient } from "@/db";
import {
  conceptMaps,
  cuecards,
  goldenNotes,
  multipleChoiceQuestions,
  openQuestions,
  summaries,
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

/**
 * Higher-order function to bind database parameter to insert functions
 * Eliminates repetitive lambda functions and type casting
 */
function withDatabase<T>(
  insertFn: (
    data: T[],
    courseId: string,
    weekId: string,
    database: DatabaseClient
  ) => Promise<void>,
  database: DatabaseClient
) {
  return (data: T[], courseId: string, weekId: string) =>
    insertFn(data, courseId, weekId, database);
}

// Insert functions for each content type
async function insertGoldenNotes(
  data: z.infer<typeof GoldenNotesArraySchema>,
  courseId: string,
  weekId: string,
  database: DatabaseClient
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
    await database.insert(goldenNotes).values(notesToInsert);
  }
}

async function insertCuecards(
  data: z.infer<typeof CuecardsArraySchema>,
  courseId: string,
  weekId: string,
  database: DatabaseClient
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
    await database.insert(cuecards).values(cuecardsToInsert);
  }
}

async function insertMCQs(
  data: z.infer<typeof MCQsArraySchema>,
  courseId: string,
  weekId: string,
  database: DatabaseClient
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
    await database.insert(multipleChoiceQuestions).values(mcqsToInsert);
  }
}

async function insertOpenQuestions(
  data: z.infer<typeof OpenQuestionsArraySchema>,
  courseId: string,
  weekId: string,
  database: DatabaseClient
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
    await database.insert(openQuestions).values(questionsToInsert);
  }
}

async function insertSummaries(
  data: z.infer<typeof SummarySchema>[],
  courseId: string,
  weekId: string,
  database: DatabaseClient
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
    await database.insert(summaries).values(summaryToInsert);
  }
}

async function insertConceptMaps(
  data: z.infer<typeof ConceptMapSchema>[],
  courseId: string,
  weekId: string,
  database: DatabaseClient
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
    await database.insert(conceptMaps).values(conceptMapsToInsert);
  }
}

export async function generateGoldenNotesForCourseWeek(
  courseId: string,
  weekId: string,
  materialIds: string[],
  config: GoldenNotesConfig,
  database: DatabaseClient
): Promise<ContentGenerationResult> {
  return generateContent({
    courseId,
    weekId,
    materialIds,
    config,
    contentType: "goldenNotes",
    schema: GoldenNotesArraySchema,
    insertFunction: withDatabase(insertGoldenNotes, database),
    responseType: "array",
    database,
  });
}

export async function generateCuecardsForWeek(
  courseId: string,
  weekId: string,
  materialIds: string[],
  config: CuecardsConfig,
  database: DatabaseClient
): Promise<ContentGenerationResult> {
  return generateContent({
    courseId,
    weekId,
    materialIds,
    config,
    contentType: "cuecards",
    schema: CuecardsArraySchema,
    insertFunction: withDatabase(insertCuecards, database),
    responseType: "array",
    database,
  });
}

export async function generateMCQsForWeek(
  courseId: string,
  weekId: string,
  materialIds: string[],
  config: McqsConfig,
  database: DatabaseClient
): Promise<ContentGenerationResult> {
  return generateContent({
    courseId,
    weekId,
    materialIds,
    config,
    contentType: "multipleChoice",
    schema: MCQsArraySchema,
    insertFunction: withDatabase(insertMCQs, database),
    responseType: "array",
    database,
  });
}

export async function generateOpenQuestionsForWeek(
  courseId: string,
  weekId: string,
  materialIds: string[],
  config: OpenQuestionsConfig,
  database: DatabaseClient
): Promise<ContentGenerationResult> {
  return generateContent({
    courseId,
    weekId,
    materialIds,
    config,
    contentType: "openQuestions",
    schema: OpenQuestionsArraySchema,
    insertFunction: withDatabase(insertOpenQuestions, database),
    responseType: "array",
    database,
  });
}

export async function generateSummariesForWeek(
  courseId: string,
  weekId: string,
  materialIds: string[],
  config: SummariesConfig,
  database: DatabaseClient
): Promise<ContentGenerationResult> {
  return generateContent({
    courseId,
    weekId,
    materialIds,
    config,
    contentType: "summaries",
    schema: SummarySchema,
    insertFunction: withDatabase(insertSummaries, database),
    responseType: "object",
    database,
  });
}

export async function generateConceptMapsForWeek(
  courseId: string,
  weekId: string,
  materialIds: string[],
  config: ConceptMapsConfig,
  database: DatabaseClient
): Promise<ContentGenerationResult> {
  return generateContent({
    courseId,
    weekId,
    materialIds,
    config,
    contentType: "conceptMaps",
    schema: ConceptMapSchema,
    insertFunction: withDatabase(insertConceptMaps, database),
    responseType: "object",
    maxTokens: 4000,
    database,
  });
}
