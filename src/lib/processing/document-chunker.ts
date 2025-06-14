/**
 * Document Chunker for StudyLoop AI
 * Implements intelligent text chunking with overlap for optimal AI processing
 * Cost-optimized for reduced token usage
 */

export interface DocumentChunk {
  content: string;
  index: number;
  startPosition: number;
  endPosition: number;
  metadata: {
    chunkLength: number;
    wordCount: number;
    hasOverlap: boolean;
    overlapLength?: number;
    section?: string;
    pageNumber?: number;
  };
}

export interface ChunkingOptions {
  chunkSize: number;
  overlapSize: number;
  preserveSentences: boolean;
  preserveParagraphs: boolean;
  minChunkSize?: number;
  maxChunkSize?: number;
}

export interface ChunkingResult {
  chunks: DocumentChunk[];
  totalChunks: number;
  originalLength: number;
  processingMetadata: {
    chunkingStrategy: string;
    averageChunkSize: number;
    overlapPercentage: number;
    processedAt: string;
  };
}

/**
 * Cost-optimized chunking configuration for reduced token usage
 */
export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunkSize: 800, // Reduced from 1000 for cost optimization
  overlapSize: 150, // Reduced from 200 for cost optimization
  preserveSentences: true,
  preserveParagraphs: true,
  minChunkSize: 80, // Reduced from 100
  maxChunkSize: 1200, // Reduced from 1500
};

/**
 * Chunk document text into overlapping segments
 */
export function chunkDocument(
  text: string,
  options: Partial<ChunkingOptions> = {}
): ChunkingResult {
  const config = { ...DEFAULT_CHUNKING_OPTIONS, ...options };

  if (!text || text.trim().length === 0) {
    return {
      chunks: [],
      totalChunks: 0,
      originalLength: 0,
      processingMetadata: {
        chunkingStrategy: "empty-document",
        averageChunkSize: 0,
        overlapPercentage: 0,
        processedAt: new Date().toISOString(),
      },
    };
  }

  // Normalize text
  const normalizedText = normalizeText(text);
  const chunks: DocumentChunk[] = [];

  let position = 0;
  let chunkIndex = 0;

  while (position < normalizedText.length) {
    const chunk = extractChunk(normalizedText, position, config, chunkIndex);

    if (chunk) {
      chunks.push(chunk);
      // Move position forward by chunk size minus overlap
      position = chunk.endPosition - config.overlapSize;
      chunkIndex++;
    } else {
      // Fallback: move by chunk size if extraction fails
      position += config.chunkSize;
    }
  }

  // Calculate metadata
  const totalChunkLength = chunks.reduce(
    (sum, chunk) => sum + chunk.content.length,
    0
  );
  const averageChunkSize =
    chunks.length > 0 ? totalChunkLength / chunks.length : 0;
  const overlapPercentage = (config.overlapSize / config.chunkSize) * 100;

  return {
    chunks,
    totalChunks: chunks.length,
    originalLength: normalizedText.length,
    processingMetadata: {
      chunkingStrategy: getChunkingStrategy(config),
      averageChunkSize: Math.round(averageChunkSize),
      overlapPercentage: Math.round(overlapPercentage * 100) / 100,
      processedAt: new Date().toISOString(),
    },
  };
}

/**
 * Extract a single chunk from the document
 */
function extractChunk(
  text: string,
  startPosition: number,
  config: ChunkingOptions,
  index: number
): DocumentChunk | null {
  if (startPosition >= text.length) {
    return null;
  }

  let endPosition = Math.min(startPosition + config.chunkSize, text.length);
  let chunkText = text.substring(startPosition, endPosition);

  // If this isn't the last chunk and we want to preserve sentences/paragraphs
  if (endPosition < text.length) {
    if (config.preserveParagraphs) {
      // Find the last paragraph break within the chunk
      const lastParagraph = chunkText.lastIndexOf("\n\n");
      if (lastParagraph > (config.minChunkSize ?? 80)) {
        endPosition = startPosition + lastParagraph + 2;
        chunkText = text.substring(startPosition, endPosition);
      }
    } else if (config.preserveSentences) {
      // Find the last sentence ending within the chunk
      const sentenceEndings = /[.!?]\s+/g;
      let lastSentenceEnd = -1;
      let match: RegExpExecArray | null;

      match = sentenceEndings.exec(chunkText);
      while (match !== null) {
        lastSentenceEnd = match.index + match[0].length;
        match = sentenceEndings.exec(chunkText);
      }

      if (lastSentenceEnd > (config.minChunkSize ?? 80)) {
        endPosition = startPosition + lastSentenceEnd;
        chunkText = text.substring(startPosition, endPosition);
      }
    }
  }

  // Ensure minimum chunk size
  const minSize = config.minChunkSize ?? 80;
  if (chunkText.length < minSize && endPosition < text.length) {
    endPosition = Math.min(startPosition + minSize, text.length);
    chunkText = text.substring(startPosition, endPosition);
  }

  // Trim whitespace
  chunkText = chunkText.trim();

  // Skip empty chunks
  if (chunkText.length === 0) {
    return null;
  }

  // Calculate overlap
  const hasOverlap = index > 0;
  const overlapLength = hasOverlap
    ? Math.min(config.overlapSize, chunkText.length)
    : 0;

  return {
    content: chunkText,
    index,
    startPosition,
    endPosition: startPosition + chunkText.length,
    metadata: {
      chunkLength: chunkText.length,
      wordCount: countWords(chunkText),
      hasOverlap,
      overlapLength,
    },
  };
}

/**
 * Normalize text for consistent chunking
 */
function normalizeText(text: string): string {
  return (
    text
      // Normalize line endings
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Normalize multiple spaces
      .replace(/[ \t]+/g, " ")
      // Normalize multiple line breaks (preserve paragraph structure)
      .replace(/\n{3,}/g, "\n\n")
      // Trim
      .trim()
  );
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Get human-readable chunking strategy description
 */
function getChunkingStrategy(config: ChunkingOptions): string {
  const strategies: string[] = [];

  if (config.preserveParagraphs) {
    strategies.push("paragraph-aware");
  } else if (config.preserveSentences) {
    strategies.push("sentence-aware");
  } else {
    strategies.push("fixed-size");
  }

  strategies.push(`${config.chunkSize}chars`);
  strategies.push(`${config.overlapSize}overlap`);
  strategies.push("cost-optimized");

  return strategies.join("-");
}

/**
 * Cost-optimized chunking for minimal token usage
 */
export function chunkForCostOptimization(
  text: string,
  maxTokenBudget = 1000
): ChunkingResult {
  // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
  const estimatedTokensPerChar = 0.25;
  const maxCharsForBudget = Math.floor(maxTokenBudget / estimatedTokensPerChar);

  // Use smaller chunks to stay within budget
  const optimizedOptions: ChunkingOptions = {
    chunkSize: Math.min(600, maxCharsForBudget * 0.8), // 80% of budget per chunk
    overlapSize: 100, // Minimal overlap
    preserveSentences: true,
    preserveParagraphs: false, // Disable for tighter control
    minChunkSize: 50,
    maxChunkSize: maxCharsForBudget,
  };

  return chunkDocument(text, optimizedOptions);
}

/**
 * Chunk document by semantic sections (experimental)
 */
export function chunkBySemanticSections(
  text: string,
  options: Partial<ChunkingOptions> = {}
): ChunkingResult {
  const config = { ...DEFAULT_CHUNKING_OPTIONS, ...options };

  // Split by clear section markers
  const sections = text.split(/\n\s*(?:Chapter|Section|Part|\d+\.|\#\#)\s+/i);
  const chunks: DocumentChunk[] = [];

  let position = 0;
  let chunkIndex = 0;

  for (const section of sections) {
    if (section.trim().length === 0) continue;

    // If section is small enough, treat as single chunk
    if (section.length <= config.chunkSize) {
      chunks.push({
        content: section.trim(),
        index: chunkIndex,
        startPosition: position,
        endPosition: position + section.length,
        metadata: {
          chunkLength: section.length,
          wordCount: countWords(section),
          hasOverlap: false,
          section: `Section ${chunkIndex + 1}`,
        },
      });
      chunkIndex++;
    } else {
      // Chunk large sections normally
      const sectionResult = chunkDocument(section, config);
      for (const chunk of sectionResult.chunks) {
        chunks.push({
          ...chunk,
          index: chunkIndex,
          startPosition: position + chunk.startPosition,
          endPosition: position + chunk.endPosition,
          metadata: {
            ...chunk.metadata,
            section: `Section ${chunkIndex + 1}`,
          },
        });
        chunkIndex++;
      }
    }

    position += section.length;
  }

  const totalChunkLength = chunks.reduce(
    (sum, chunk) => sum + chunk.content.length,
    0
  );
  const averageChunkSize =
    chunks.length > 0 ? totalChunkLength / chunks.length : 0;

  return {
    chunks,
    totalChunks: chunks.length,
    originalLength: text.length,
    processingMetadata: {
      chunkingStrategy: "semantic-sections-cost-optimized",
      averageChunkSize: Math.round(averageChunkSize),
      overlapPercentage: 0,
      processedAt: new Date().toISOString(),
    },
  };
}
