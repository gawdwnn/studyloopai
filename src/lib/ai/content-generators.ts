/**
 * AI Content Generators
 * Core logic for generating educational content using AI models
 */

import { db } from "@/db";
import {
	cuecards as cuecardsTable,
	documentChunks,
	goldenNotes,
	multipleChoiceQuestions as mcqTable,
	openQuestions as openQuestionsTable,
	summaries as summariesTable,
} from "@/db/schema";
import type { GenerationConfig } from "@/lib/services/adaptive-generation-service";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getTextGenerationModel } from "./config";
import { type PromptContext, type SupportedContentType, getPromptByType } from "./prompts";

// Zod schemas for generated content
const GoldenNoteSchema = z.object({
	title: z.string(),
	content: z.string(),
	priority: z.number(),
	category: z.string().optional(),
});

const CuecardSchema = z.object({
	question: z.string(),
	answer: z.string(),
	difficulty: z.string(),
});

const MCQSchema = z.object({
	question: z.string(),
	options: z.array(z.string()).length(4),
	correctAnswer: z.string(),
	explanation: z.string(),
	difficulty: z.string(),
});

const OpenQuestionSchema = z.object({
	question: z.string(),
	sampleAnswer: z.string(),
	gradingRubric: z.object({
		excellent: z.string(),
		good: z.string(),
		needs_improvement: z.string(),
	}),
	difficulty: z.string(),
});

const SummarySchema = z.object({
	title: z.string(),
	content: z.string(),
	wordCount: z.number(),
	summaryType: z.string(),
});

// Array schemas for validation
const GoldenNotesArraySchema = z.array(GoldenNoteSchema);
const CuecardsArraySchema = z.array(CuecardSchema);
const MCQsArraySchema = z.array(MCQSchema);
const OpenQuestionsArraySchema = z.array(OpenQuestionSchema);

// Content generation result interface
export interface ContentGenerationResult {
	success: boolean;
	contentType: SupportedContentType;
	generatedCount: number;
	error?: string;
}

// Aggregate generation result
export interface AggregateGenerationResult {
	success: boolean;
	materialId: string;
	results: ContentGenerationResult[];
	totalGenerated: number;
	errors: string[];
}

/**
 * Get document chunks for a material
 */
async function getMaterialChunks(materialId: string): Promise<string[]> {
	const chunks = await db
		.select({ content: documentChunks.content })
		.from(documentChunks)
		.where(eq(documentChunks.materialId, materialId))
		.orderBy(documentChunks.chunkIndex);

	return chunks.map((chunk) => chunk.content);
}

/**
 * Combine chunks into content for generation
 */
function combineChunksForGeneration(chunks: string[], maxLength = 15000): string {
	// Combine chunks up to maxLength to avoid token limits
	let combinedContent = "";
	let currentLength = 0;

	for (const chunk of chunks) {
		if (currentLength + chunk.length > maxLength) {
			break;
		}
		combinedContent += `${chunk}\n\n`;
		currentLength += chunk.length;
	}

	return combinedContent.trim();
}

/**
 * Parse JSON response with Zod validation for arrays
 */
function parseJsonArrayResponse<T>(
	response: string,
	schema: z.ZodArray<z.ZodTypeAny>,
	fallback: T[]
): T[] {
	try {
		const parsed = JSON.parse(response);
		const result = schema.safeParse(parsed);

		if (result.success) {
			return result.data;
		}
		console.warn("Array validation failed:", result.error.errors);
		return fallback;
	} catch (error) {
		console.warn("Failed to parse JSON array response:", error);
		return fallback;
	}
}

/**
 * Parse JSON response with Zod validation for single objects
 */
function parseJsonObjectResponse<T>(
	response: string,
	schema: z.ZodObject<z.ZodRawShape>,
	fallback: T
): T {
	try {
		const parsed = JSON.parse(response);
		const result = schema.safeParse(parsed);

		if (result.success) {
			return result.data as T;
		}
		console.warn("Object validation failed:", result.error.errors);
		return fallback;
	} catch (error) {
		console.warn("Failed to parse JSON object response:", error);
		return fallback;
	}
}

/**
 * Aggregate chunks from multiple materials
 */
async function getCombinedChunks(materialIds: string[]): Promise<string[]> {
	const allChunks: string[] = [];
	for (const id of materialIds) {
		const materialChunks = await getMaterialChunks(id);
		allChunks.push(...materialChunks);
	}
	return allChunks;
}

/**
 * Generate golden notes for all course materials attached to a week
 */
export async function generateGoldenNotesForWeek(
	courseId: string,
	weekId: string,
	materialIds: string[],
	config: Pick<GenerationConfig, "goldenNotesCount" | "difficulty" | "focus">
): Promise<ContentGenerationResult> {
	try {
		const chunks = await getCombinedChunks(materialIds);
		if (chunks.length === 0) {
			return {
				success: false,
				contentType: "goldenNotes",
				generatedCount: 0,
				error: "No content chunks found for week",
			};
		}

		const content = combineChunksForGeneration(chunks);
		const prompt = getPromptByType("goldenNotes");
		if (!prompt) {
			return {
				success: false,
				contentType: "goldenNotes",
				generatedCount: 0,
				error: "Prompt not found for golden notes",
			};
		}

		const context: PromptContext = {
			content,
			difficulty: config.difficulty,
			count: config.goldenNotesCount,
			focus: config.focus,
		};

		const result = await generateText({
			model: getTextGenerationModel(),
			system: prompt.systemPrompt,
			prompt: prompt.userPrompt(context),
			maxTokens: 3000,
			temperature: 0.7,
		});

		const parsedNotes = parseJsonArrayResponse(
			result.text,
			GoldenNotesArraySchema,
			[] as z.infer<typeof GoldenNoteSchema>[]
		);

		// Add Content Structure validation
		// Add Content Quality validation and filtering

		const notesToInsert = parsedNotes.map((note) => ({
			courseId,
			weekId,
			title: note.title,
			content: note.content,
			priority: note.priority || 1,
			category: note.category || "general",
			metadata: {},
		}));

		await db.insert(goldenNotes).values(notesToInsert);

		return {
			success: true,
			contentType: "goldenNotes",
			generatedCount: notesToInsert.length,
		};
	} catch (error) {
		console.error("Golden notes generation for week failed:", error);
		return {
			success: false,
			contentType: "goldenNotes",
			generatedCount: 0,
			error: (error as Error).message,
		};
	}
}

/**
 * Generate cuecards for all course materials attached to a week
 */
export async function generateCuecardsForWeek(
	courseId: string,
	weekId: string,
	materialIds: string[],
	config: Pick<GenerationConfig, "cuecardsCount" | "difficulty">
): Promise<ContentGenerationResult> {
	try {
		const chunks = await getCombinedChunks(materialIds);
		if (chunks.length === 0) {
			return {
				success: false,
				contentType: "cuecards",
				generatedCount: 0,
				error: "No content chunks found for week",
			};
		}

		const content = combineChunksForGeneration(chunks);
		const prompt = getPromptByType("cuecards");
		if (!prompt) {
			return {
				success: false,
				contentType: "cuecards",
				generatedCount: 0,
				error: "Prompt not found for cuecards",
			};
		}

		const context: PromptContext = {
			content,
			difficulty: config.difficulty,
			count: config.cuecardsCount,
		};

		const result = await generateText({
			model: getTextGenerationModel(),
			system: prompt.systemPrompt,
			prompt: prompt.userPrompt(context),
			maxTokens: 3000,
			temperature: 0.7,
		});

		const parsed = parseJsonArrayResponse(
			result.text,
			CuecardsArraySchema,
			[] as z.infer<typeof CuecardSchema>[]
		);

		// Add Content Structure validation
		// Add Content Quality validation and filtering

		await db.insert(cuecardsTable).values(
			parsed.map((fc) => ({
				courseId,
				weekId,
				question: fc.question,
				answer: fc.answer,
				difficulty: fc.difficulty,
				metadata: {},
			}))
		);

		return {
			success: true,
			contentType: "cuecards",
			generatedCount: parsed.length,
		};
	} catch (error) {
		console.error("Cuecards generation for week failed:", error);
		return {
			success: false,
			contentType: "cuecards",
			generatedCount: 0,
			error: (error as Error).message,
		};
	}
}

/**
 * Generate MCQs for all course materials attached to a week
 */
export async function generateMCQsForWeek(
	courseId: string,
	weekId: string,
	materialIds: string[],
	config: Pick<GenerationConfig, "mcqExercisesCount" | "difficulty">
): Promise<ContentGenerationResult> {
	try {
		const chunks = await getCombinedChunks(materialIds);
		if (chunks.length === 0) {
			return {
				success: false,
				contentType: "multipleChoice",
				generatedCount: 0,
				error: "No content chunks found for week",
			};
		}

		const content = combineChunksForGeneration(chunks);
		const prompt = getPromptByType("multipleChoice");
		if (!prompt) {
			return {
				success: false,
				contentType: "multipleChoice",
				generatedCount: 0,
				error: "Prompt not found for MCQs",
			};
		}

		const context: PromptContext = {
			content,
			difficulty: config.difficulty,
			count: config.mcqExercisesCount,
		};

		const result = await generateText({
			model: getTextGenerationModel(),
			system: prompt.systemPrompt,
			prompt: prompt.userPrompt(context),
			maxTokens: 3500,
			temperature: 0.7,
		});

		const parsed = parseJsonArrayResponse(
			result.text,
			MCQsArraySchema,
			[] as z.infer<typeof MCQSchema>[]
		);

		// Add Content Structure validation
		// Add Content Quality validation and filtering

		await db.insert(mcqTable).values(
			parsed.map((q) => ({
				courseId,
				weekId,
				question: q.question,
				options: q.options,
				correctAnswer: q.correctAnswer,
				explanation: q.explanation,
				difficulty: q.difficulty,
				metadata: {},
			}))
		);

		return {
			success: true,
			contentType: "multipleChoice",
			generatedCount: parsed.length,
		};
	} catch (error) {
		console.error("MCQ generation for week failed:", error);
		return {
			success: false,
			contentType: "multipleChoice",
			generatedCount: 0,
			error: (error as Error).message,
		};
	}
}

/**
 * Generate open questions for all course materials attached to a week
 */
export async function generateOpenQuestionsForWeek(
	courseId: string,
	weekId: string,
	materialIds: string[],
	config: Pick<GenerationConfig, "examExercisesCount" | "difficulty">
): Promise<ContentGenerationResult> {
	try {
		const chunks = await getCombinedChunks(materialIds);
		if (chunks.length === 0) {
			return {
				success: false,
				contentType: "openQuestions",
				generatedCount: 0,
				error: "No content chunks found for week",
			};
		}

		const content = combineChunksForGeneration(chunks);
		const prompt = getPromptByType("openQuestions");
		if (!prompt) {
			return {
				success: false,
				contentType: "openQuestions",
				generatedCount: 0,
				error: "Prompt not found for open questions",
			};
		}

		const context: PromptContext = {
			content,
			difficulty: config.difficulty,
			count: config.examExercisesCount,
		};

		const result = await generateText({
			model: getTextGenerationModel(),
			system: prompt.systemPrompt,
			prompt: prompt.userPrompt(context),
			maxTokens: 3500,
			temperature: 0.7,
		});

		const parsed = parseJsonArrayResponse(
			result.text,
			OpenQuestionsArraySchema,
			[] as z.infer<typeof OpenQuestionSchema>[]
		);

		// Add Content Structure validation
		// Add Content Quality validation and filtering

		await db.insert(openQuestionsTable).values(
			parsed.map((q) => ({
				courseId,
				weekId,
				question: q.question,
				sampleAnswer: q.sampleAnswer,
				gradingRubric: q.gradingRubric,
				difficulty: q.difficulty,
				metadata: {},
			}))
		);

		return {
			success: true,
			contentType: "openQuestions",
			generatedCount: parsed.length,
		};
	} catch (error) {
		console.error("Open questions generation for week failed:", error);
		return {
			success: false,
			contentType: "openQuestions",
			generatedCount: 0,
			error: (error as Error).message,
		};
	}
}

/**
 * Generate summaries for all course materials attached to a week
 */
export async function generateSummariesForWeek(
	courseId: string,
	weekId: string,
	materialIds: string[],
	config: Pick<GenerationConfig, "summaryLength" | "difficulty">
): Promise<ContentGenerationResult> {
	try {
		const chunks = await getCombinedChunks(materialIds);
		if (chunks.length === 0) {
			return {
				success: false,
				contentType: "summaries",
				generatedCount: 0,
				error: "No content chunks found for week",
			};
		}

		const content = combineChunksForGeneration(chunks);
		const prompt = getPromptByType("summaries");
		if (!prompt) {
			return {
				success: false,
				contentType: "summaries",
				generatedCount: 0,
				error: "Prompt not found for summaries",
			};
		}

		const context: PromptContext = {
			content,
			difficulty: config.difficulty,
			count: Math.ceil(config.summaryLength / 50),
		};

		const result = await generateText({
			model: getTextGenerationModel(),
			system: prompt.systemPrompt,
			prompt: prompt.userPrompt(context),
			maxTokens: 3500,
			temperature: 0.7,
		});

		const parsed = parseJsonObjectResponse(
			result.text,
			SummarySchema,
			{} as z.infer<typeof SummarySchema>
		);

		// Validate object has content
		if (!parsed || Object.keys(parsed).length === 0) {
			console.warn("AI generated empty summary object");
		}

		// Add Content Structure validation
		// Add Content Quality validation and filtering

		await db.insert(summariesTable).values({
			courseId,
			weekId,
			title: parsed.title,
			content: parsed.content,
			summaryType: parsed.summaryType,
			wordCount: parsed.wordCount,
			metadata: {},
		});

		return {
			success: true,
			contentType: "summaries",
			generatedCount: 1,
		};
	} catch (error) {
		console.error("Summaries generation for week failed:", error);
		return {
			success: false,
			contentType: "summaries",
			generatedCount: 0,
			error: (error as Error).message,
		};
	}
}
