/**
 * Summaries schema and types
 */

import { z } from "zod";

// Summary item schema
export const SummarySchema = z.object({
	title: z.string().min(1, "Title is required"),
	content: z.string().min(1, "Content is required"),
	wordCount: z.number().int().min(1, "Word count must be positive"),
	summaryType: z.string().default("general"),
});

// Summaries array schema (though typically single object)
export const SummariesArraySchema = z.array(SummarySchema);

// Type definitions
export type Summary = z.infer<typeof SummarySchema>;
export type SummariesArray = z.infer<typeof SummariesArraySchema>;
