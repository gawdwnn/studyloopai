/**
 * Summaries generation prompt
 */

import type { ContentGenerationPrompt } from "../types";

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
- Format content using markdown (headings, lists, emphasis, etc.)

Output as a JSON object with this structure:
{
  "summaries": [
    {
      "title": "Descriptive title for the summary",
      "content": "Well-structured summary content formatted in markdown with proper headings, lists, and emphasis",
      "wordCount": actual_word_count,
      "summaryType": "general"
    }
  ]
}`,
};
