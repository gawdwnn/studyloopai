/**
 * AI Content Generation Analytics Events
 * Server-side only events for tracking AI content generation and usage
 */

import { trackServerEvent } from "../posthog";

export const contentGenerationEvents = {
	contentGenerated: async (
		contentType: "mcq" | "summary" | "notes" | "cuecard" | "concept_map",
		properties: {
			courseId: string;
			materialId?: string;
			processingTime?: number;
			wordCount?: number;
			modelUsed?: string;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"ai_content_generated",
			{
				content_type: contentType,
				course_id: properties.courseId,
				material_id: properties.materialId,
				processing_time_ms: properties.processingTime,
				word_count: properties.wordCount,
				model_used: properties.modelUsed,
				event_category: "product_usage",
			},
			userId
		);
	},

	contentRegenerated: async (
		contentType: string,
		reason: "quality" | "user_request" | "error",
		properties: {
			courseId?: string;
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
			embeddingModel?: string;
			totalTokens?: number;
		},
		userId?: string
	) => {
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
	},
};
