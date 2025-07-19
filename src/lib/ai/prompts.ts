/**
 * AI Content Generation Prompts
 * Optimized prompts for different educational content types
 */

// Flexible prompt contexts - standalone types that can evolve independently
export interface GoldenNotesPromptContext {
	content: string;
	difficulty: "beginner" | "intermediate" | "advanced";
	count: number;
	focus?: "conceptual" | "practical" | "mixed";
	language?: string;
}

export interface CuecardsPromptContext {
	content: string;
	difficulty: "beginner" | "intermediate" | "advanced";
	count: number;
	language?: string;
}

export interface MultipleChoicePromptContext {
	content: string;
	difficulty: "beginner" | "intermediate" | "advanced";
	count: number;
	language?: string;
}

export interface OpenQuestionsPromptContext {
	content: string;
	difficulty: "beginner" | "intermediate" | "advanced";
	count: number;
	language?: string;
}

export interface SummariesPromptContext {
	content: string;
	difficulty: "beginner" | "intermediate" | "advanced";
	count: number;
	focus?: "conceptual" | "practical" | "mixed";
	language?: string;
}

export interface ConceptMapPromptContext {
	content: string;
	difficulty: "beginner" | "intermediate" | "advanced";
	style?: string;
	focus?: "conceptual" | "practical" | "mixed";
	language?: string;
}

export interface ContentGenerationPrompt {
	systemPrompt: string;
	userPrompt: (context: Record<string, unknown>) => string;
	outputSchema: object;
}

// Golden Notes Generation
export const goldenNotesPrompt: ContentGenerationPrompt = {
	systemPrompt: `You are an expert educational content creator specializing in distilling complex information into clear, actionable golden notes. Your task is to identify and extract the most important concepts, key points, and essential knowledge from educational material.

Guidelines:
- Focus on core concepts that students must understand
- Create clear, concise explanations
- Prioritize practical knowledge and real-world applications
- Use active voice and clear language
- Include relevant examples when helpful
- Structure information hierarchically (main concepts → details)`,

	userPrompt: ({ content, difficulty, count, focus }) => `
Please analyze the following educational content and create ${count} golden notes that capture the most important concepts and knowledge.

Content to analyze:
${content}

Requirements:
- Difficulty level: ${difficulty}
- Focus: ${focus || "conceptual"}
- Generate exactly ${count} golden notes
- Each note should be comprehensive but concise (150-300 words)
- Include a clear title for each note
- Prioritize based on importance (1 = most important, ${count} = least important)

Output as a JSON array with this structure:
[
  {
    "title": "Clear, descriptive title",
    "content": "Comprehensive explanation of the concept",
    "priority": 1,
    "category": "topic category"
  }
]`,

	outputSchema: {
		type: "array",
		items: {
			type: "object",
			properties: {
				title: { type: "string" },
				content: { type: "string" },
				priority: { type: "number" },
				category: { type: "string" },
			},
			required: ["title", "content", "priority"],
		},
	},
};

// Cuecards Generation
export const cuecardsPrompt: ContentGenerationPrompt = {
	systemPrompt: `You are an expert in creating effective cuecards for active recall and spaced repetition learning. Your cuecards should test understanding, not just memorization, and follow proven educational principles.

Guidelines:
- Create clear, specific questions that test understanding
- Provide complete, accurate answers
- Avoid overly complex or multi-part questions
- Use various question types (definition, application, comparison, etc.)
- Ensure questions are self-contained (no external context needed)
- Focus on testable knowledge and key concepts`,

	userPrompt: ({ content, difficulty, count }) => `
Create ${count} cuecards from the following educational content. Focus on key concepts, definitions, and important facts that students should remember.

Content to analyze:
${content}

Requirements:
- Difficulty level: ${difficulty}
- Generate exactly ${count} cuecards
- Questions should be clear and specific
- Answers should be complete but concise
- Vary question types (what, how, why, when, etc.)
- Test understanding, not just memorization

Output as a JSON array with this structure:
[
  {
    "question": "Clear, specific question",
    "answer": "Complete, accurate answer",
    "difficulty": "${difficulty}"
  }
]`,

	outputSchema: {
		type: "array",
		items: {
			type: "object",
			properties: {
				question: { type: "string" },
				answer: { type: "string" },
				difficulty: { type: "string" },
			},
			required: ["question", "answer", "difficulty"],
		},
	},
};

// Multiple Choice Questions Generation
export const multipleChoicePrompt: ContentGenerationPrompt = {
	systemPrompt: `You are an expert in creating high-quality multiple choice questions for educational assessment. Your questions should effectively test student understanding and include plausible distractors.

Guidelines:
- Create clear, unambiguous questions
- Include one correct answer and 3 plausible distractors
- Avoid "all of the above" or "none of the above" options
- Make distractors believable but clearly incorrect
- Test understanding and application, not just recall
- Provide clear explanations for the correct answer`,

	userPrompt: ({ content, difficulty, count }) => `
Create ${count} multiple choice questions from the following educational content. Each question should test understanding of key concepts.

Content to analyze:
${content}

Requirements:
- Difficulty level: ${difficulty}
- Generate exactly ${count} questions
- Each question has 4 options (A, B, C, D)
- Include clear explanations for correct answers
- Make distractors plausible but incorrect
- Test different types of knowledge (facts, concepts, applications)

Output as a JSON array with this structure:
[
  {
    "question": "Clear question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "A",
    "explanation": "Why this answer is correct",
    "difficulty": "${difficulty}"
  }
]`,

	outputSchema: {
		type: "array",
		items: {
			type: "object",
			properties: {
				question: { type: "string" },
				options: {
					type: "array",
					items: { type: "string" },
					minItems: 4,
					maxItems: 4,
				},
				correctAnswer: { type: "string" },
				explanation: { type: "string" },
				difficulty: { type: "string" },
			},
			required: [
				"question",
				"options",
				"correctAnswer",
				"explanation",
				"difficulty",
			],
		},
	},
};

// Open Questions Generation
export const openQuestionsPrompt: ContentGenerationPrompt = {
	systemPrompt: `You are an expert in creating thought-provoking open-ended questions that encourage critical thinking and deep understanding. Your questions should promote analysis, synthesis, and evaluation of concepts.

Guidelines:
- Create questions that require explanation, analysis, or synthesis
- Encourage critical thinking and deeper understanding
- Provide comprehensive sample answers
- Include grading rubrics with clear criteria
- Focus on application and understanding, not just recall
- Vary question types (explain, analyze, compare, evaluate, etc.)`,

	userPrompt: ({ content, difficulty, count }) => `
Create ${count} open-ended questions from the following educational content. These should be discussion or essay questions that encourage deep thinking.

Content to analyze:
${content}

Requirements:
- Difficulty level: ${difficulty}
- Generate exactly ${count} questions
- Questions should require explanation or analysis
- Include comprehensive sample answers
- Provide grading rubrics with specific criteria
- Encourage critical thinking and application

Output as a JSON array with this structure:
[
  {
    "question": "Thought-provoking question requiring explanation",
    "sampleAnswer": "Comprehensive sample answer showing expected depth",
    "gradingRubric": {
      "excellent": "Criteria for excellent response",
      "good": "Criteria for good response", 
      "needs_improvement": "Criteria for response needing improvement"
    },
    "difficulty": "${difficulty}"
  }
]`,

	outputSchema: {
		type: "array",
		items: {
			type: "object",
			properties: {
				question: { type: "string" },
				sampleAnswer: { type: "string" },
				gradingRubric: {
					type: "object",
					properties: {
						excellent: { type: "string" },
						good: { type: "string" },
						needs_improvement: { type: "string" },
					},
				},
				difficulty: { type: "string" },
			},
			required: ["question", "sampleAnswer", "gradingRubric", "difficulty"],
		},
	},
};

// Summaries Generation
export const summariesPrompt: ContentGenerationPrompt = {
	systemPrompt: `You are an expert in creating comprehensive yet concise summaries of educational content. Your summaries should capture the essential information while remaining accessible and well-organized.

Guidelines:
- Identify and highlight main concepts and themes
- Organize information logically and hierarchically
- Maintain clarity while being comprehensive
- Include key facts, concepts, and relationships
- Use clear headings and structure
- Preserve important details while eliminating redundancy`,

	userPrompt: ({ content, difficulty, count }) => `
Create a comprehensive summary of the following educational content. The summary should capture all essential information in a clear, organized format.

Content to analyze:
${content}

Requirements:
- Target word count: approximately ${(count as number) * 50} words
- Difficulty level: ${difficulty}
- Include clear title and structure
- Organize information logically
- Highlight key concepts and relationships
- Maintain clarity and readability

Output as a JSON object with this structure:
{
  "title": "Descriptive title for the summary",
  "content": "Well-structured summary content",
  "wordCount": actual_word_count,
  "summaryType": "general"
}`,

	outputSchema: {
		type: "object",
		properties: {
			title: { type: "string" },
			content: { type: "string" },
			wordCount: { type: "number" },
			summaryType: { type: "string" },
		},
		required: ["title", "content", "wordCount", "summaryType"],
	},
};

// Concept Maps Generation
export const conceptMapsPrompt: ContentGenerationPrompt = {
	systemPrompt: `You are an expert in creating detailed and visually intuitive concept maps from educational content. Your concept maps should clearly illustrate the relationships between key concepts, topics, and ideas.

Guidelines:
- Identify the central concept and build the map around it
- Use a clear hierarchical or relational structure
- Define nodes for key concepts, topics, and examples
- Create meaningful edges to show relationships (e.g., "leads to," "part of")
- Use a consistent visual style and labeling system
- Ensure the map is comprehensive yet easy to follow`,

	userPrompt: ({
		content,
		difficulty,
		style = "hierarchical",
		focus = "conceptual",
	}) => `
Create a comprehensive concept map from the following educational content. The map should visually represent the key concepts and their relationships.

Content to analyze:
${content}

Requirements:
- Style: ${style} (organize concepts accordingly)
- Difficulty level: ${difficulty}
- Focus: ${focus}
- Create meaningful nodes and connections
- Include metadata about the central concept
- Ensure the map is educational and clear

Output as a JSON object with this structure:
{
  "title": "Descriptive title for the concept map",
  "content": {
    "nodes": [
      {
        "id": "unique_id",
        "label": "Node label",
        "type": "concept|topic|subtopic|example",
        "level": 0-5,
        "x": optional_x_coordinate,
        "y": optional_y_coordinate
      }
    ],
    "edges": [
      {
        "source": "source_node_id",
        "target": "target_node_id",
        "label": "descriptive label for the relationship (e.g., 'is an example of')",
        "type": "relationship type (e.g., 'related', 'part_of')",
        "strength": 0.8
      }
    ],
    "metadata": {
      "central_concept": "Main concept of the map",
      "complexity_level": "${difficulty}",
      "focus_area": "${focus}",
      "style": "${style}"
    }
  },
  "style": "${style}"
}`,

	outputSchema: {
		type: "object",
		properties: {
			title: { type: "string" },
			content: {
				type: "object",
				properties: {
					nodes: {
						type: "array",
						items: {
							type: "object",
							properties: {
								id: { type: "string" },
								label: { type: "string" },
								type: {
									type: "string",
									enum: ["concept", "topic", "subtopic", "example"],
								},
								level: { type: "number", minimum: 0, maximum: 5 },
								x: { type: "number" },
								y: { type: "number" },
							},
							required: ["id", "label", "type", "level"],
						},
					},
					edges: {
						type: "array",
						items: {
							type: "object",
							properties: {
								source: { type: "string" },
								target: { type: "string" },
								label: { type: "string" },
								type: {
									type: "string",
									enum: [
										"related",
										"causes",
										"leads_to",
										"part_of",
										"example_of",
									],
								},
								strength: { type: "number", minimum: 0, maximum: 1 },
							},
							required: ["source", "target", "type"],
						},
					},
					metadata: {
						type: "object",
						properties: {
							central_concept: { type: "string" },
							complexity_level: {
								type: "string",
								enum: ["beginner", "intermediate", "advanced"],
							},
							focus_area: {
								type: "string",
								enum: ["conceptual", "practical", "mixed"],
							},
							style: {
								type: "string",
								enum: ["hierarchical", "radial", "network"],
							},
						},
						required: [
							"central_concept",
							"complexity_level",
							"focus_area",
							"style",
						],
					},
				},
				required: ["nodes", "edges", "metadata"],
			},
			style: { type: "string", enum: ["hierarchical", "radial", "network"] },
		},
		required: ["title", "content", "style"],
	},
};

// Helper function to get prompt by content type
export function getPromptByType(
	contentType: string
): ContentGenerationPrompt | null {
	switch (contentType) {
		case "goldenNotes":
			return goldenNotesPrompt;
		case "cuecards":
			return cuecardsPrompt;
		case "multipleChoice":
			return multipleChoicePrompt;
		case "openQuestions":
			return openQuestionsPrompt;
		case "summaries":
			return summariesPrompt;
		case "conceptMaps":
			return conceptMapsPrompt;
		default:
			return null;
	}
}

// Content type validation
export const SUPPORTED_CONTENT_TYPES = [
	"goldenNotes",
	"cuecards",
	"multipleChoice",
	"openQuestions",
	"summaries",
	"conceptMaps",
] as const;

export type SupportedContentType = (typeof SUPPORTED_CONTENT_TYPES)[number];
