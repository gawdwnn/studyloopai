import { z } from "zod";

export const GoldenNoteSchema = z.object({
	title: z.string(),
	content: z.string(),
	priority: z.number(),
	category: z.string().optional(),
});

export const CuecardSchema = z.object({
	question: z.string(),
	answer: z.string(),
	difficulty: z.string(),
});

export const MCQSchema = z.object({
	question: z.string(),
	options: z.array(z.string()).length(4),
	correctAnswer: z.string(),
	explanation: z.string(),
	difficulty: z.string(),
});

export const OpenQuestionSchema = z.object({
	question: z.string(),
	sampleAnswer: z.string(),
	gradingRubric: z.object({
		excellent: z.string(),
		good: z.string(),
		needs_improvement: z.string(),
	}),
	difficulty: z.string(),
});

export const SummarySchema = z.object({
	title: z.string(),
	content: z.string(),
	wordCount: z.number(),
	summaryType: z.string(),
});

export const ConceptMapSchema = z.object({
	title: z.string(),
	content: z.object({
		nodes: z.array(
			z.object({
				id: z.string(),
				label: z.string(),
				type: z.enum(["concept", "topic", "subtopic", "example"]),
				level: z.number().min(0).max(5),
				x: z.number().optional(),
				y: z.number().optional(),
			})
		),
		edges: z.array(
			z.object({
				source: z.string(),
				target: z.string(),
				label: z.string().optional(),
				type: z.enum([
					"related",
					"causes",
					"leads_to",
					"part_of",
					"example_of",
				]),
				strength: z.number().min(0).max(1).default(0.5),
			})
		),
		metadata: z.object({
			central_concept: z.string(),
			complexity_level: z.enum(["beginner", "intermediate", "advanced"]),
			focus_area: z.enum(["conceptual", "practical", "mixed"]),
			style: z.enum(["hierarchical", "radial", "network"]),
		}),
	}),
	style: z.enum(["hierarchical", "radial", "network"]),
});

export const GoldenNotesArraySchema = z.array(GoldenNoteSchema);
export const CuecardsArraySchema = z.array(CuecardSchema);
export const MCQsArraySchema = z.array(MCQSchema);
export const OpenQuestionsArraySchema = z.array(OpenQuestionSchema);
