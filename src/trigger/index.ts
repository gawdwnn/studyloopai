// This file is the entry point for your Trigger.dev tasks.
// It should export all of your tasks.

// Export core orchestration tasks
export { aiContentOrchestrator } from "./ai-content-orchestrator";
export { ingestCourseMaterials } from "./ingest-course-materials";
export { processAndEmbedIndividualMaterial } from "./process-and-embed-individual-material";

// Export individual content generation tasks
export { generateConceptMaps } from "./generate-concept-maps";
export { generateCuecards } from "./generate-cuecards";
export { generateGoldenNotes } from "./generate-golden-notes";
export { generateMCQs } from "./generate-mcqs";
export { generateOpenQuestions } from "./generate-open-questions";
export { generateSummaries } from "./generate-summaries";
// export { processWebhookRetries } from "./process-webhook-retries"; // removed in favor of per-event retries
export { handlePolarWebhook } from "./handle-polar-webhook";
