/**
 * Golden Notes generation prompt
 */

import type { ContentGenerationPrompt } from "../types";

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
};
