/**
 * Open Questions generation prompt
 */

import type { ContentGenerationPrompt } from "../types";

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
};
