/**
 * AI content generation pipeline - functional composition
 */

import { createLogger } from "@/lib/utils/logger";
import { generateObject } from "ai";
import { getTextGenerationModel } from "../../config";
import type {
	ConfigMap,
	ContentStrategy,
	GenerationRequest,
	GenerationResult,
	OutputMap,
	SupportedContentType,
} from "../types";
import { retrieveChunks, validateChunkRequest } from "./chunk-retriever";
import { getStrategy } from "./strategy-factory";

const logger = createLogger("ai:generation:pipeline");

/**
 * Generate AI response using the strategy's prompt and context
 */
export async function generateAIResponse<T extends SupportedContentType>(
	context: Record<string, unknown>,
	strategy: ContentStrategy<ConfigMap[T], OutputMap[T]>,
	options?: { maxTokens?: number; temperature?: number }
): Promise<OutputMap[T][]> {
	const prompt = strategy.getPrompt();

	logger.info(`Generating AI response for ${strategy.contentType}`, {
		contentType: strategy.contentType,
		contextKeys: Object.keys(context),
		options,
	});

	const result = await generateObject({
		model: getTextGenerationModel(),
		system: prompt.systemPrompt,
		prompt: prompt.userPrompt(context),
		schema: strategy.getSchema(),
		maxTokens: options?.maxTokens || 3500,
		temperature: options?.temperature || 0.7,
	});

	return strategy.extractArrayFromObject(result.object);
}

/**
 * Build generation result from parsed data
 */
export function buildGenerationResult<T extends SupportedContentType>(
	data: OutputMap[T][],
	contentType: T,
	success = true,
	error?: string
): GenerationResult {
	return {
		success,
		contentType,
		generatedCount: data.length,
		error,
		metadata: {
			dataValid: data.length > 0 && Object.keys(data[0] as object).length > 0,
			responseType: "array", // Could be inferred from strategy
		},
	};
}

/**
 * Validate generated data before persistence
 */
export function validateGeneratedData<T>(
	data: T[],
	contentType: SupportedContentType
): boolean {
	if (!data || data.length === 0) {
		logger.warn(`AI generated empty content for ${contentType}`, {
			contentType,
			dataLength: 0,
		});
		return false;
	}

	// Check if first item has meaningful content
	const firstItem = data[0] as object;
	if (!firstItem || Object.keys(firstItem).length === 0) {
		logger.warn(`AI generated empty object for ${contentType}`, {
			contentType,
			dataLength: data.length,
		});
		return false;
	}

	return true;
}

/**
 * Main generation pipeline - orchestrates the entire flow
 */
export async function executeGenerationPipeline<T extends SupportedContentType>(
	request: GenerationRequest<T>
): Promise<GenerationResult> {
	const {
		contentType,
		courseId,
		weekId,
		materialIds,
		config,
		cacheKey,
		options,
	} = request;

	logger.info(`Starting generation pipeline for ${contentType}`, {
		contentType,
		courseId,
		weekId,
		materialIds: materialIds.length,
		hasCache: !!cacheKey,
	});

	try {
		// 1. Validate request
		validateChunkRequest({
			materialIds,
			cacheKey,
			courseId,
			weekId,
			contentType,
		});

		// 2. Get strategy for content type
		const strategy = getStrategy(contentType);

		// 3. Retrieve chunks (cache-first)
		const chunks = await retrieveChunks({
			materialIds,
			cacheKey,
			courseId,
			weekId,
			contentType,
		});

		// 4. Build context using strategy
		const context = strategy.buildContext(chunks.content, config);

		// 5. Generate AI response
		const parsedData = await generateAIResponse(context, strategy, options);

		// 6. Validate data
		const isValid = validateGeneratedData(parsedData, contentType);
		if (!isValid) {
			return buildGenerationResult(
				[],
				contentType,
				false,
				"Generated content was empty or invalid"
			);
		}

		// 7. Persist data using strategy
		await strategy.persist(parsedData, courseId, weekId);

		// 8. Return success result
		logger.info(`Generation pipeline completed for ${contentType}`, {
			contentType,
			generatedCount: parsedData.length,
			chunkSource: chunks.metadata?.source,
		});

		return buildGenerationResult(parsedData, contentType, true);
	} catch (error) {
		// Log error details for debugging but let all errors surface naturally
		logger.error(`Generation pipeline failed for ${contentType}`, {
			contentType,
			courseId,
			weekId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		// Re-throw the original error so ALL errors (including AI SDK and quota) surface immediately
		throw error;
	}
}
