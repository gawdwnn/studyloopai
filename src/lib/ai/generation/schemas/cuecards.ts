/**
 * Cuecards schema and types
 */

import { z } from "zod";

// Cuecard item schema
export const CuecardSchema = z.object({
	question: z.string().min(1, "Question is required"),
	answer: z.string().min(1, "Answer is required"),
	difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

// Cuecards array schema
export const CuecardsArraySchema = z.array(CuecardSchema);

// Type definitions
export type Cuecard = z.infer<typeof CuecardSchema>;
export type CuecardsArray = z.infer<typeof CuecardsArraySchema>;
