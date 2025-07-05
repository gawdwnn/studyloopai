/**
 * AI Content Validation
 * Quality validation and post-processing for generated educational content
 */

import { z } from "zod";
import type { SupportedContentType } from "./prompts";

export interface ValidationResult {
	isValid: boolean;
	error?: string;
	warnings?: string[];
	data?: unknown;
}

// Zod schemas for validation
const DifficultySchema = z.enum(["beginner", "intermediate", "advanced"]);

const GoldenNoteSchema = z.object({
	title: z.string().min(5, "Title must be at least 5 characters"),
	content: z
		.string()
		.min(50, "Content must be at least 50 characters")
		.max(1000, "Content should not exceed 1000 characters"),
	priority: z.number().min(1, "Priority must be at least 1").default(1),
	category: z.string().optional(),
});

const CuecardSchema = z.object({
	question: z
		.string()
		.min(10, "Question must be at least 10 characters")
		.max(500, "Question should not exceed 500 characters"),
	answer: z.string().min(5, "Answer must be at least 5 characters"),
	difficulty: DifficultySchema.default("intermediate"),
});

const MCQSchema = z.object({
	question: z.string().min(10, "Question must be at least 10 characters"),
	options: z
		.array(z.string().min(1, "Option cannot be empty"))
		.length(4, "Must have exactly 4 options"),
	correctAnswer: z.enum(["A", "B", "C", "D"], { message: "Correct answer must be A, B, C, or D" }),
	explanation: z.string().min(20, "Explanation must be at least 20 characters"),
	difficulty: DifficultySchema.default("intermediate"),
});

const GradingRubricSchema = z.object({
	excellent: z.string().min(1, "Excellent criteria cannot be empty"),
	good: z.string().min(1, "Good criteria cannot be empty"),
	needs_improvement: z.string().min(1, "Needs improvement criteria cannot be empty"),
});

const OpenQuestionSchema = z.object({
	question: z.string().min(20, "Question must be at least 20 characters"),
	sampleAnswer: z.string().min(50, "Sample answer must be at least 50 characters"),
	gradingRubric: GradingRubricSchema,
	difficulty: DifficultySchema.default("intermediate"),
});

const SummarySchema = z.object({
	title: z.string().min(5, "Title must be at least 5 characters"),
	content: z.string().min(100, "Content must be at least 100 characters"),
	wordCount: z.number().min(1, "Word count must be positive"),
	summaryType: z.string().default("general"),
});

// Array schemas
const GoldenNotesSchema = z.array(GoldenNoteSchema).min(1, "At least one golden note is required");
const CuecardsSchema = z.array(CuecardSchema).min(1, "At least one cuecard is required");
const MCQsSchema = z.array(MCQSchema).min(1, "At least one MCQ is required");
const OpenQuestionsSchema = z
	.array(OpenQuestionSchema)
	.min(1, "At least one open question is required");

// Export types
export type GeneratedGoldenNote = z.infer<typeof GoldenNoteSchema>;
export type GeneratedCuecard = z.infer<typeof CuecardSchema>;
export type GeneratedMCQ = z.infer<typeof MCQSchema>;
export type GeneratedOpenQuestion = z.infer<typeof OpenQuestionSchema>;
export type GeneratedSummary = z.infer<typeof SummarySchema>;

/**
 * Validate golden notes content using Zod
 */
function validateGoldenNotes(content: unknown): ValidationResult {
	const result = GoldenNotesSchema.safeParse(content);

	if (!result.success) {
		return {
			isValid: false,
			error: result.error.errors.map((err) => `${err.path.join(".")} - ${err.message}`).join("; "),
		};
	}

	// Check for warnings based on content quality
	const warnings: string[] = [];
	result.data.forEach((note, index) => {
		if (note.title.length < 10) {
			warnings.push(`Golden note ${index + 1} title could be more descriptive`);
		}
		if (note.content.length < 100) {
			warnings.push(`Golden note ${index + 1} content could be more detailed`);
		}
	});

	return {
		isValid: true,
		data: result.data,
		warnings: warnings.length > 0 ? warnings : undefined,
	};
}

/**
 * Validate cuecards content using Zod
 */
function validateCuecards(content: unknown): ValidationResult {
	const result = CuecardsSchema.safeParse(content);

	if (!result.success) {
		return {
			isValid: false,
			error: result.error.errors.map((err) => `${err.path.join(".")} - ${err.message}`).join("; "),
		};
	}

	// Check for warnings based on content quality
	const warnings: string[] = [];
	result.data.forEach((card, index) => {
		if (card.question.length < 20) {
			warnings.push(`Cuecard ${index + 1} question could be more detailed`);
		}
		if (card.answer.length < 10) {
			warnings.push(`Cuecard ${index + 1} answer could be more comprehensive`);
		}
		if (card.question.length > 300) {
			warnings.push(`Cuecard ${index + 1} question might be too long for effective memorization`);
		}
	});

	return {
		isValid: true,
		data: result.data,
		warnings: warnings.length > 0 ? warnings : undefined,
	};
}

/**
 * Validate multiple choice questions content using Zod
 */
function validateMultipleChoice(content: unknown): ValidationResult {
	const result = MCQsSchema.safeParse(content);

	if (!result.success) {
		return {
			isValid: false,
			error: result.error.errors.map((err) => `${err.path.join(".")} - ${err.message}`).join("; "),
		};
	}

	// Check for warnings based on content quality
	const warnings: string[] = [];
	result.data.forEach((mcq, index) => {
		if (mcq.question.length < 20) {
			warnings.push(`MCQ ${index + 1} question could be more detailed`);
		}
		if (mcq.explanation.length < 50) {
			warnings.push(`MCQ ${index + 1} explanation could be more comprehensive`);
		}
		// Check for option length consistency
		const optionLengths = mcq.options.map((opt) => opt.length);
		const maxLength = Math.max(...optionLengths);
		const minLength = Math.min(...optionLengths);
		if (maxLength > minLength * 3) {
			warnings.push(`MCQ ${index + 1} has inconsistent option lengths`);
		}
	});

	return {
		isValid: true,
		data: result.data,
		warnings: warnings.length > 0 ? warnings : undefined,
	};
}

/**
 * Validate open questions content using Zod
 */
function validateOpenQuestions(content: unknown): ValidationResult {
	const result = OpenQuestionsSchema.safeParse(content);

	if (!result.success) {
		return {
			isValid: false,
			error: result.error.errors.map((err) => `${err.path.join(".")} - ${err.message}`).join("; "),
		};
	}

	// Check for warnings based on content quality
	const warnings: string[] = [];
	result.data.forEach((question, index) => {
		if (question.question.length < 30) {
			warnings.push(`Open question ${index + 1} question could be more detailed`);
		}
		if (question.sampleAnswer.length < 100) {
			warnings.push(`Open question ${index + 1} sample answer could be more comprehensive`);
		}
		// Check rubric quality
		const rubricEntries = Object.values(question.gradingRubric);
		if (rubricEntries.some((entry) => entry.length < 20)) {
			warnings.push(`Open question ${index + 1} rubric criteria could be more detailed`);
		}
	});

	return {
		isValid: true,
		data: result.data,
		warnings: warnings.length > 0 ? warnings : undefined,
	};
}

/**
 * Validate summaries content using Zod
 */
function validateSummaries(content: unknown): ValidationResult {
	const result = SummarySchema.safeParse(content);

	if (!result.success) {
		return {
			isValid: false,
			error: result.error.errors.map((err) => `${err.path.join(".")} - ${err.message}`).join("; "),
		};
	}

	// Check for warnings based on content quality
	const warnings: string[] = [];
	const summary = result.data;

	if (summary.title.length < 10) {
		warnings.push("Summary title could be more descriptive");
	}

	if (summary.content.length < 200) {
		warnings.push("Summary content could be more comprehensive");
	}

	// Validate word count accuracy
	const actualWordCount = summary.content.split(/\s+/).length;
	if (Math.abs(summary.wordCount - actualWordCount) > actualWordCount * 0.1) {
		warnings.push("Word count was adjusted to match actual content");
	}

	return {
		isValid: true,
		data: result.data,
		warnings: warnings.length > 0 ? warnings : undefined,
	};
}

/**
 * Main validation function
 */
export function validateGeneratedContent(
	content: unknown,
	contentType: SupportedContentType
): ValidationResult {
	try {
		switch (contentType) {
			case "goldenNotes":
				return validateGoldenNotes(content);
			case "cuecards":
				return validateCuecards(content);
			case "multipleChoice":
				return validateMultipleChoice(content);
			case "openQuestions":
				return validateOpenQuestions(content);
			case "summaries":
				return validateSummaries(content);
			default:
				return {
					isValid: false,
					error: `Unsupported content type: ${contentType}`,
				};
		}
	} catch (error) {
		return {
			isValid: false,
			error: `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}

/**
 * Content quality scoring
 */
export function calculateContentQuality(
	content: unknown,
	contentType: SupportedContentType
): number {
	const validation = validateGeneratedContent(content, contentType);

	if (!validation.isValid) {
		return 0;
	}

	let score = 100;

	// Deduct points for warnings
	if (validation.warnings) {
		score -= validation.warnings.length * 5;
	}

	// Additional quality checks based on content type using validated data
	if (validation.data) {
		if (contentType === "goldenNotes" && Array.isArray(validation.data)) {
			const notes = validation.data as GeneratedGoldenNote[];
			const avgLength = notes.reduce((sum, note) => sum + note.content.length, 0) / notes.length;

			if (avgLength < 100) score -= 10;
			if (avgLength > 500) score += 5;
		}

		if (contentType === "cuecards" && Array.isArray(validation.data)) {
			const cards = validation.data as GeneratedCuecard[];
			const avgQuestionLength =
				cards.reduce((sum, card) => sum + card.question.length, 0) / cards.length;

			if (avgQuestionLength < 20) score -= 10;
			if (avgQuestionLength > 50 && avgQuestionLength < 150) score += 5;
		}

		if (contentType === "multipleChoice" && Array.isArray(validation.data)) {
			const mcqs = validation.data as GeneratedMCQ[];
			const avgExplanationLength =
				mcqs.reduce((sum, mcq) => sum + mcq.explanation.length, 0) / mcqs.length;

			if (avgExplanationLength > 100) score += 5;
		}

		if (contentType === "openQuestions" && Array.isArray(validation.data)) {
			const questions = validation.data as GeneratedOpenQuestion[];
			const avgSampleAnswerLength =
				questions.reduce((sum, q) => sum + q.sampleAnswer.length, 0) / questions.length;

			if (avgSampleAnswerLength > 150) score += 5;
		}

		if (contentType === "summaries" && validation.data) {
			const summary = validation.data as GeneratedSummary;
			if (summary.content.length > 300) score += 5;
		}
	}

	return Math.max(0, Math.min(100, score));
}
