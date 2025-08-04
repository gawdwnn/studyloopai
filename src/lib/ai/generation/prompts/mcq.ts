/**
 * Multiple Choice Questions generation prompt
 */

import type { ContentGenerationPrompt } from "../types";

export const mcqPrompt: ContentGenerationPrompt = {
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
};
