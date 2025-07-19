/**
 * Processing Metadata Service
 * Handles updating both document processing metadata and week-level content generation metadata
 */

import { db } from "@/db";
import {
	type ProcessingMetadata,
	type WeekContentGenerationMetadata,
	courseMaterials,
	courseWeeks,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export type ContentType =
	| "cuecards"
	| "multipleChoice"
	| "openQuestions"
	| "summaries"
	| "goldenNotes"
	| "conceptMaps";

/**
 * Updates material-level document processing metadata (processing status, extraction, chunking, embedding)
 */
export async function updateMaterialProcessingMetadata(
	materialId: string,
	updates: Partial<ProcessingMetadata>
): Promise<void> {
	// Get current material to preserve existing metadata
	const [currentMaterial] = await db
		.select({ processingMetadata: courseMaterials.processingMetadata })
		.from(courseMaterials)
		.where(eq(courseMaterials.id, materialId));

	const currentMetadata =
		(currentMaterial?.processingMetadata as ProcessingMetadata) || {};

	// Merge updates with existing metadata (document processing only)
	const mergedMetadata: ProcessingMetadata = {
		...currentMetadata,
		...updates,
	};

	await db
		.update(courseMaterials)
		.set({ processingMetadata: mergedMetadata })
		.where(eq(courseMaterials.id, materialId));
}

/**
 * Updates week-level content generation metadata after content generation is completed
 */
export async function updateWeekContentGenerationMetadata(
	weekId: string,
	contentType: ContentType,
	generatedCount: number,
	logger?: {
		info: (message: string, metadata?: Record<string, unknown>) => void;
		error: (message: string, metadata?: Record<string, unknown>) => void;
	}
) {
	try {
		// Get current week metadata
		const [currentWeek] = await db
			.select({
				contentGenerationMetadata: courseWeeks.contentGenerationMetadata,
			})
			.from(courseWeeks)
			.where(eq(courseWeeks.id, weekId));

		if (!currentWeek) {
			throw new Error(`Week not found: ${weekId}`);
		}

		const currentMetadata =
			(currentWeek.contentGenerationMetadata as WeekContentGenerationMetadata) ||
			{};

		// Initialize generationResults if it doesn't exist
		if (!currentMetadata.generationResults) {
			currentMetadata.generationResults = {
				totalGenerated: 0,
				contentCounts: {
					goldenNotes: 0,
					cuecards: 0,
					mcqs: 0,
					openQuestions: 0,
					summaries: 0,
					conceptMaps: 0,
				},
				generatedAt: new Date().toISOString(),
			};
		}

		// Map content types to schema keys
		const contentTypeMapping: Record<
			ContentType,
			keyof typeof currentMetadata.generationResults.contentCounts
		> = {
			cuecards: "cuecards",
			multipleChoice: "mcqs",
			openQuestions: "openQuestions",
			summaries: "summaries",
			goldenNotes: "goldenNotes",
			conceptMaps: "conceptMaps",
		};

		// Update the specific content type count
		const schemaKey = contentTypeMapping[contentType];
		currentMetadata.generationResults.contentCounts[schemaKey] = generatedCount;

		// Recalculate total generated count
		currentMetadata.generationResults.totalGenerated = Object.values(
			currentMetadata.generationResults.contentCounts
		).reduce((sum, count) => sum + count, 0);

		// Update generatedAt timestamp
		currentMetadata.generationResults.generatedAt = new Date().toISOString();

		// Update the week in the database
		await db
			.update(courseWeeks)
			.set({ contentGenerationMetadata: currentMetadata })
			.where(eq(courseWeeks.id, weekId));

		if (logger) {
			logger.info("Updated week content generation metadata", {
				weekId,
				contentType,
				generatedCount,
				totalGenerated: currentMetadata.generationResults.totalGenerated,
			});
		}

		return {
			success: true,
			totalGenerated: currentMetadata.generationResults.totalGenerated,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		if (logger) {
			logger.error("Failed to update week content generation metadata", {
				weekId,
				contentType,
				generatedCount,
				error: errorMessage,
			});
		}

		return {
			success: false,
			error: errorMessage,
			totalGenerated: 0,
		};
	}
}
