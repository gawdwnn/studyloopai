/**
 * Content Availability Service
 *
 * Real-time detection of available content for intelligent session setup
 * 
 * Note: Simplified post-metadata cleanup - no generation status tracking
 * We only check for existing content availability
 */

import { db } from "@/db";
import {
	conceptMaps,
	cuecards,
	goldenNotes,
	multipleChoiceQuestions,
	openQuestions,
	summaries,
} from "@/db/schema";
import type { FeatureType } from "@/types/generation-types";
import { and, count, eq } from "drizzle-orm";

export interface ContentAvailabilityStatus {
	courseId: string;
	weekId: string;
	contentAvailability: Record<FeatureType, ContentTypeAvailability>;
	overallStatus: "available" | "none" | "error";
	lastUpdated: Date;
}

export interface ContentTypeAvailability {
	status: "available" | "none" | "error";
	count: number;
	isGenerating: boolean; // Now properly tracks generation status
	error?: string;
}

/**
 * Get comprehensive content availability status for a course week
 */
export async function getContentAvailability(
	courseId: string,
	weekId: string
): Promise<ContentAvailabilityStatus> {
	try {
		// Check if generation is in progress
		const isGenerating = await isGenerationInProgress(courseId, weekId);
		
		// Get content counts for each type
		const contentCounts = await Promise.all([
			getContentCount("goldenNotes", courseId, weekId),
			getContentCount("cuecards", courseId, weekId),
			getContentCount("mcqs", courseId, weekId),
			getContentCount("openQuestions", courseId, weekId),
			getContentCount("summaries", courseId, weekId),
			getContentCount("conceptMaps", courseId, weekId),
		]);

		const [
			goldenNotesCount,
			cuecardsCount,
			mcqsCount,
			openQuestionsCount,
			summariesCount,
			conceptMapsCount,
		] = contentCounts;

		// Build availability status for each content type
		const contentAvailability: Record<FeatureType, ContentTypeAvailability> = {
			goldenNotes: buildContentTypeAvailability("goldenNotes", goldenNotesCount, isGenerating),
			cuecards: buildContentTypeAvailability("cuecards", cuecardsCount, isGenerating),
			mcqs: buildContentTypeAvailability("mcqs", mcqsCount, isGenerating),
			openQuestions: buildContentTypeAvailability("openQuestions", openQuestionsCount, isGenerating),
			summaries: buildContentTypeAvailability("summaries", summariesCount, isGenerating),
			conceptMaps: buildContentTypeAvailability("conceptMaps", conceptMapsCount, isGenerating),
		};

		// Determine overall status (simplified: available if any content exists)
		const overallStatus = determineOverallStatus(contentAvailability);

		return {
			courseId,
			weekId,
			contentAvailability,
			overallStatus,
			lastUpdated: new Date(),
		};
	} catch (error) {
		console.error("Content availability check failed:", error);

		// Return error status with empty availability
		const errorAvailability: Record<FeatureType, ContentTypeAvailability> = {
			goldenNotes: createErrorAvailability(error),
			cuecards: createErrorAvailability(error),
			mcqs: createErrorAvailability(error),
			openQuestions: createErrorAvailability(error),
			summaries: createErrorAvailability(error),
			conceptMaps: createErrorAvailability(error),
		};

		return {
			courseId,
			weekId,
			contentAvailability: errorAvailability,
			overallStatus: "error",
			lastUpdated: new Date(),
		};
	}
}

/**
 * Check availability for a specific content type
 */
export async function getContentTypeAvailability(
	courseId: string,
	weekId: string,
	contentType: FeatureType
): Promise<ContentTypeAvailability> {
	try {
		const isGenerating = await isGenerationInProgress(courseId, weekId);
		const count = await getContentCount(contentType, courseId, weekId);
		return buildContentTypeAvailability(contentType, count, isGenerating);
	} catch (error) {
		return createErrorAvailability(error);
	}
}

/**
 * Get the count of available content for a specific type
 */
async function getContentCount(
	contentType: FeatureType,
	courseId: string,
	weekId: string
): Promise<number> {
	const whereClause = and(
		eq(getTableForContentType(contentType).courseId, courseId),
		eq(getTableForContentType(contentType).weekId, weekId)
	);

	const [result] = await db
		.select({ count: count() })
		.from(getTableForContentType(contentType))
		.where(whereClause);

	return result.count;
}

/**
 * Get the database table for a content type
 */
function getTableForContentType(contentType: FeatureType) {
	switch (contentType) {
		case "goldenNotes":
			return goldenNotes;
		case "cuecards":
			return cuecards;
		case "mcqs":
			return multipleChoiceQuestions;
		case "openQuestions":
			return openQuestions;
		case "summaries":
			return summaries;
		case "conceptMaps":
			return conceptMaps;
		default:
			throw new Error(`Unknown content type: ${contentType}`);
	}
}

/**
 * Build availability status for a content type
 */
function buildContentTypeAvailability(
	_contentType: FeatureType,
	count: number,
	isGenerating: boolean
): ContentTypeAvailability {
	let status: ContentTypeAvailability["status"];
	if (count > 0) {
		status = "available";
	} else {
		status = "none";
	}

	return {
		status,
		count,
		isGenerating, // Now properly tracks generation status
	};
}

/**
 * Create error availability status
 */
function createErrorAvailability(error: unknown): ContentTypeAvailability {
	return {
		status: "error",
		count: 0,
		isGenerating: false,
		error: error instanceof Error ? error.message : "Unknown error",
	};
}

/**
 * Determine the overall status based on individual content availability
 */
function determineOverallStatus(
	contentAvailability: Record<FeatureType, ContentTypeAvailability>
): "available" | "none" | "error" {
	const statuses = Object.values(contentAvailability);

	// If any content has errors, overall status is error
	if (statuses.some((s) => s.status === "error")) {
		return "error";
	}

	// If any content is available, overall status is available
	if (statuses.some((s) => s.status === "available")) {
		return "available";
	}

	// No content available
	return "none";
}

/**
 * Check if any content is currently being generated for a week
 * Now uses generation config status tracking
 */
export async function isGenerationInProgress(
	courseId: string,
	weekId: string
): Promise<boolean> {
	const { getActiveGenerationConfigsForWeek } = await import(
		"@/lib/actions/generation-config"
	);
	
	const activeConfigs = await getActiveGenerationConfigsForWeek(courseId, weekId);
	
	// Check if any config is currently processing
	return activeConfigs.some((config) => config.generationStatus === "processing");
}

/**
 * Get active generation configs for a week
 * Now uses proper generation config status tracking
 */
export async function getActiveGenerationConfigs(
	courseId: string,
	weekId: string
) {
	const { getActiveGenerationConfigsForWeek } = await import(
		"@/lib/actions/generation-config"
	);
	
	return await getActiveGenerationConfigsForWeek(courseId, weekId);
}