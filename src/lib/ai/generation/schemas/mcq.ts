/**
 * Multiple Choice Questions schema and types
 */

import { z } from "zod";

// MCQ item schema
export const MCQSchema = z.object({
	question: z.string().min(1, "Question is required"),
	options: z.array(z.string()).length(4, "Must have exactly 4 options"),
	correctAnswer: z.string().min(1, "Correct answer is required"),
	explanation: z.string().min(1, "Explanation is required"),
	difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

// MCQs array schema
export const MCQsArraySchema = z.array(MCQSchema);

// Type definitions
export type MCQ = z.infer<typeof MCQSchema>;
export type MCQsArray = z.infer<typeof MCQsArraySchema>;
