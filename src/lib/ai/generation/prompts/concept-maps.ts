/**
 * Concept Maps generation prompt
 */

import type { ContentGenerationPrompt } from "../types";

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
  "conceptMaps": [
    {
      "title": "Descriptive title for the concept map",
      "content": {
        "nodes": [
          {
            "id": "unique_id",
            "label": "Node label",
            "type": "concept",
            "level": 0,
            "x": 0,
            "y": 0
          }
        ],
        "edges": [
          {
            "source": "source_node_id",
            "target": "target_node_id",
            "label": "descriptive label for the relationship",
            "type": "related",
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
    }
  ]
}`,
};
