/**
 * Golden Notes schema and types
 */

import { z } from "zod";

// Golden note item schema
export const GoldenNoteSchema = z.object({
	title: z.string().min(1, "Title is required"),
	content: z.string().min(1, "Content is required"),
	priority: z.number().int().min(1, "Priority must be at least 1"),
	category: z.string().optional(),
});

// Golden notes array schema
export const GoldenNotesArraySchema = z.array(GoldenNoteSchema);

// Type definitions
export type GoldenNote = z.infer<typeof GoldenNoteSchema>;
export type GoldenNotesArray = z.infer<typeof GoldenNotesArraySchema>;
