/**
 * Multiple Choice Questions generation prompt
 */

import type { ContentGenerationPrompt } from "../types";

export const mcqPrompt: ContentGenerationPrompt = {
	systemPrompt:
		"You are an expert educational assessment designer specializing in multiple choice questions. Your expertise includes creating clear, unambiguous questions that effectively test student knowledge at appropriate cognitive levels. You understand how to craft plausible distractors that reveal common misconceptions without being trick questions. Each question you create must have exactly one correct answer and three incorrect options that are believable but clearly wrong to someone who understands the material.",

	userPrompt: ({ content, difficulty, count }) => `
Task: Create ${count} multiple choice questions at ${difficulty} level.

OUTPUT FORMAT (follow exactly):
{
  "mcqs": [
    {
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correctAnswer": 1,
      "explanation": "2 + 2 equals 4, which is the second option (index 1)",
      "difficulty": "easy"
    },
    {
      "question": "Which process allows plants to convert sunlight into energy?",
      "options": ["Cellular respiration", "Photosynthesis", "Fermentation", "Osmosis"],
      "correctAnswer": 1,
      "explanation": "Photosynthesis is the process by which plants use sunlight, carbon dioxide, and water to produce glucose and oxygen",
      "difficulty": "intermediate"
    }
  ]
}

CRITICAL RULES:
1. correctAnswer must be a numeric index: 0, 1, 2, or 3
2. 0 = first option, 1 = second option, 2 = third option, 3 = fourth option  
3. options array must have exactly 4 items
4. Each question must have only one correct answer

Content to create questions from:
${content}

Difficulty guidelines:
- easy: Test basic facts and definitions
- intermediate: Test understanding and application
- hard: Test analysis and complex reasoning

Generate ${count} questions now in the exact JSON format shown above.`,
};
