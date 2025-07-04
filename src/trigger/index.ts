// This file is the entry point for your Trigger.dev tasks.
// It should export all of your tasks.

// Export core orchestration tasks
export { generateAiContent } from "./generate-ai-content";
export { ingestCourseMaterials } from "./ingest-course-materials";
export { processAndEmbedIndividualMaterial } from "./process-and-embed-individual-material";

// Export individual content generation tasks
export { generateGoldenNotes } from "./generate-golden-notes";
export { generateFlashcards } from "./generate-flashcards";
export { generateMCQs } from "./generate-mcqs";
export { generateOpenQuestions } from "./generate-open-questions";
export { generateSummaries } from "./generate-summaries";
