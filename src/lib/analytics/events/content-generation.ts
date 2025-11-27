/**
 * AI Content Generation Analytics Events
 * Server-side only events for tracking AI content generation and usage
 * Now includes Polar usage tracking for billing
 */

// No imports needed - will extract info from actual usage
import { sendUsageEvent } from "@/lib/polar/usage-events";
import { trackServerEvent } from "../posthog";

export const contentGenerationEvents = {
	contentGenerated: async (
		contentType:
			| "mcq"
			| "summary"
			| "notes"
			| "cuecard"
			| "concept_map"
			| "open_question",
		properties: {
			courseId: string;
			weekId: string;
			materialId?: string;
			processingTime?: number;
			wordCount?: number;
			modelUsed: string;
			provider: string;
			totalTokens?: number;
			success?: boolean;
			generatedCount?: number;
		},
		userId?: string
	) => {
		// Send to PostHog (existing analytics)
		await trackServerEvent(
			"ai_content_generated",
			{
				content_type: contentType,
				course_id: properties.courseId,
				week_id: properties.weekId,
				material_id: properties.materialId,
				processing_time_ms: properties.processingTime,
				word_count: properties.wordCount,
				model_used: properties.modelUsed,
				event_category: "product_usage",
			},
			userId
		);

		// Send to Polar (billing usage tracking)
		if (userId) {
			const metadata: { [k: string]: string | number | boolean } = {
				content_type: contentType,
				model: properties.modelUsed,
				provider: properties.provider,
				tokens: properties.totalTokens || properties.wordCount || 0,
				processing_time_ms: properties.processingTime || 0,
				success: properties.success !== false,
				generated_count: properties.generatedCount || 1,
				course_id: properties.courseId,
				week_id: properties.weekId,
			};

			// Add material_id only if present
			if (properties.materialId) {
				metadata.material_id = properties.materialId;
			}

			await sendUsageEvent(userId, "ai_generation", metadata);
		}
	},

	contentRegenerated: async (
		contentType: string,
		reason: "quality" | "user_request" | "error",
		properties: {
			courseId?: string;
			weekId?: string;
			originalProcessingTime?: number;
			newProcessingTime?: number;
			modelUsed?: string;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"ai_content_regenerated",
			{
				content_type: contentType,
				regeneration_reason: reason,
				course_id: properties.courseId,
				week_id: properties.weekId,
				original_processing_time_ms: properties.originalProcessingTime,
				new_processing_time_ms: properties.newProcessingTime,
				model_used: properties.modelUsed,
				event_category: "product_usage",
			},
			userId
		);
	},

	generationStarted: async (
		contentType: string,
		properties: {
			courseId: string;
			weekId?: string;
			materialId?: string;
			expectedDuration?: number;
			modelSelected?: string;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"ai_generation_started",
			{
				content_type: contentType,
				course_id: properties.courseId,
				week_id: properties.weekId,
				material_id: properties.materialId,
				expected_duration_ms: properties.expectedDuration,
				model_selected: properties.modelSelected,
				event_category: "product_usage",
			},
			userId
		);
	},

	generationFailed: async (
		contentType: string,
		errorType: string,
		properties: {
			courseId?: string;
			weekId?: string;
			materialId?: string;
			errorMessage?: string;
			processingTime?: number;
			modelUsed?: string;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"ai_generation_failed",
			{
				content_type: contentType,
				error_type: errorType,
				course_id: properties.courseId,
				week_id: properties.weekId,
				material_id: properties.materialId,
				error_message: properties.errorMessage,
				processing_time_ms: properties.processingTime,
				model_used: properties.modelUsed,
				event_category: "product_usage",
			},
			userId
		);
	},

	batchGenerationCompleted: async (
		properties: {
			courseId: string;
			contentTypes: string[];
			totalProcessingTime: number;
			successCount: number;
			failureCount: number;
			totalItems: number;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"ai_batch_generation_completed",
			{
				course_id: properties.courseId,
				content_types: properties.contentTypes,
				total_processing_time_ms: properties.totalProcessingTime,
				success_count: properties.successCount,
				failure_count: properties.failureCount,
				total_items: properties.totalItems,
				success_rate: (properties.successCount / properties.totalItems) * 100,
				event_category: "product_usage",
			},
			userId
		);
	},

	modelPerformance: async (
		modelName: string,
		properties: {
			contentType: string;
			processingTime: number;
			qualityScore?: number;
			outputLength: number;
			tokensUsed?: number;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"ai_model_performance",
			{
				model_name: modelName,
				content_type: properties.contentType,
				processing_time_ms: properties.processingTime,
				quality_score: properties.qualityScore,
				output_length: properties.outputLength,
				tokens_used: properties.tokensUsed,
				event_category: "system_performance",
			},
			userId
		);
	},

	vectorEmbedding: async (
		properties: {
			materialId: string;
			chunkCount: number;
			processingTime: number;
			embeddingModel: string;
			embeddingProvider: string;
			totalTokens?: number;
			courseId?: string;
			success?: boolean;
		},
		userId?: string
	) => {
		// Send to PostHog (existing analytics)
		await trackServerEvent(
			"vector_embedding_completed",
			{
				material_id: properties.materialId,
				chunk_count: properties.chunkCount,
				processing_time_ms: properties.processingTime,
				embedding_model: properties.embeddingModel,
				total_tokens: properties.totalTokens,
				event_category: "product_usage",
			},
			userId
		);

		// Send to Polar (billing usage tracking)
		if (userId) {
			const metadata: { [k: string]: string | number | boolean } = {
				tokens: properties.totalTokens || 0,
				chunks: properties.chunkCount || 1,
				model: properties.embeddingModel,
				provider: properties.embeddingProvider,
				processing_time_ms: properties.processingTime || 0,
				success: properties.success !== false,
				material_id: properties.materialId,
			};

			// Add course_id only if present
			if (properties.courseId) {
				metadata.course_id = properties.courseId;
			}

			await sendUsageEvent(userId, "embedding_generation", metadata);
		}
	},
};
