/**
 * Open Questions schema and types
 */

import { z } from "zod";

// Grading rubric schema
export const GradingRubricSchema = z.object({
	excellent: z.string().min(1, "Excellent criteria is required"),
	good: z.string().min(1, "Good criteria is required"),
	needs_improvement: z
		.string()
		.min(1, "Needs improvement criteria is required"),
});

// Open question item schema
export const OpenQuestionSchema = z.object({
	question: z.string().min(1, "Question is required"),
	sampleAnswer: z.string().min(1, "Sample answer is required"),
	gradingRubric: GradingRubricSchema,
	difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

// Open questions array schema
export const OpenQuestionsArraySchema = z.array(OpenQuestionSchema);

// Open questions object schema (for generateObject)
export const OpenQuestionsObjectSchema = z.object({
	openQuestions: z.array(OpenQuestionSchema),
});

// Type definitions
export type GradingRubric = z.infer<typeof GradingRubricSchema>;
export type OpenQuestion = z.infer<typeof OpenQuestionSchema>;
export type OpenQuestionsArray = z.infer<typeof OpenQuestionsArraySchema>;
export type OpenQuestionsObject = z.infer<typeof OpenQuestionsObjectSchema>;
