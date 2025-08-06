/**
 * Multiple Choice Questions schema and types
 */

import { z } from "zod";

// MCQ item schema
export const MCQSchema = z.object({
	question: z.string().min(1, "Question is required"),
	options: z.array(z.string()).length(4, "Must have exactly 4 options"),
	correctAnswer: z
		.number()
		.int()
		.min(0)
		.max(3, "Correct answer must be 0, 1, 2, or 3"),
	explanation: z.string().min(1, "Explanation is required"),
	difficulty: z.enum(["easy", "intermediate", "hard"]),
});

// MCQs array schema
export const MCQsArraySchema = z.array(MCQSchema);

// MCQs object schema (for generateObject)
export const MCQsObjectSchema = z.object({
	mcqs: z.array(MCQSchema),
});

// Type definitions
export type MCQ = z.infer<typeof MCQSchema>;
export type MCQsArray = z.infer<typeof MCQsArraySchema>;
export type MCQsObject = z.infer<typeof MCQsObjectSchema>;
