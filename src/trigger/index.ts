// This file is the entry point for your Trigger.dev tasks.
// It should export all of your tasks.

// Export core orchestration tasks
export { aiContentOrchestrator } from "./ai-content-orchestrator";
export { ingestCourseMaterials } from "./ingest-course-materials";
export { processAndEmbedIndividualMaterial } from "./process-and-embed-individual-material";

// Export individual content generation tasks
export { generateGoldenNotes } from "./generate-golden-notes";
export { generateCuecards } from "./generate-cuecards";
export { generateMCQs } from "./generate-mcqs";
export { generateOpenQuestions } from "./generate-open-questions";
export { generateSummaries } from "./generate-summaries";
export { generateConceptMaps } from "./generate-concept-maps";
