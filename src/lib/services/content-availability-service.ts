/**
 * Content Availability Service
 *
 * Real-time detection of available vs. generating content for intelligent session setup
 * and on-demand generation triggering
 */

import { db } from "@/db";
import {
	type WeekContentGenerationMetadata,
	conceptMaps,
	courseWeeks,
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
	overallStatus: "available" | "generating" | "none" | "error";
	lastUpdated: Date;
	generationMetadata?: WeekContentGenerationMetadata;
}

export interface ContentTypeAvailability {
	status: "available" | "generating" | "none" | "error";
	count: number;
	isGenerating: boolean;
	batchId?: string;
	lastGenerated?: Date;
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
		// Get week metadata to check generation status
		const [week] = await db
			.select({
				id: courseWeeks.id,
				contentGenerationStatus: courseWeeks.contentGenerationStatus,
				contentGenerationMetadata: courseWeeks.contentGenerationMetadata,
				contentGenerationTriggeredAt: courseWeeks.contentGenerationTriggeredAt,
			})
			.from(courseWeeks)
			.where(
				and(eq(courseWeeks.id, weekId), eq(courseWeeks.courseId, courseId))
			);

		if (!week) {
			throw new Error("Course week not found");
		}

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

		const generationMetadata =
			week.contentGenerationMetadata as WeekContentGenerationMetadata | null;
		const isGenerating = week.contentGenerationStatus === "processing";

		// Build availability status for each content type
		const contentAvailability: Record<FeatureType, ContentTypeAvailability> = {
			goldenNotes: buildContentTypeAvailability(
				"goldenNotes",
				goldenNotesCount,
				isGenerating,
				generationMetadata
			),
			cuecards: buildContentTypeAvailability(
				"cuecards",
				cuecardsCount,
				isGenerating,
				generationMetadata
			),
			mcqs: buildContentTypeAvailability(
				"mcqs",
				mcqsCount,
				isGenerating,
				generationMetadata
			),
			openQuestions: buildContentTypeAvailability(
				"openQuestions",
				openQuestionsCount,
				isGenerating,
				generationMetadata
			),
			summaries: buildContentTypeAvailability(
				"summaries",
				summariesCount,
				isGenerating,
				generationMetadata
			),
			conceptMaps: buildContentTypeAvailability(
				"conceptMaps",
				conceptMapsCount,
				isGenerating,
				generationMetadata
			),
		};

		// Determine overall status
		const overallStatus = determineOverallStatus(
			contentAvailability,
			isGenerating
		);

		return {
			courseId,
			weekId,
			contentAvailability,
			overallStatus,
			lastUpdated: new Date(),
			generationMetadata: generationMetadata || undefined,
		};
	} catch (error) {
		console.error("Content availability check failed:", error);

		// Return error status with empty availability
		const errorAvailability: Record<FeatureType, ContentTypeAvailability> = {
			goldenNotes: {
				status: "error",
				count: 0,
				isGenerating: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			cuecards: {
				status: "error",
				count: 0,
				isGenerating: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			mcqs: {
				status: "error",
				count: 0,
				isGenerating: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			openQuestions: {
				status: "error",
				count: 0,
				isGenerating: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			summaries: {
				status: "error",
				count: 0,
				isGenerating: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			conceptMaps: {
				status: "error",
				count: 0,
				isGenerating: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
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
		const count = await getContentCount(contentType, courseId, weekId);

		// Check if generation is in progress
		const [week] = await db
			.select({
				contentGenerationStatus: courseWeeks.contentGenerationStatus,
				contentGenerationMetadata: courseWeeks.contentGenerationMetadata,
			})
			.from(courseWeeks)
			.where(
				and(eq(courseWeeks.id, weekId), eq(courseWeeks.courseId, courseId))
			);

		const isGenerating = week?.contentGenerationStatus === "processing";
		const generationMetadata =
			week?.contentGenerationMetadata as WeekContentGenerationMetadata | null;

		return buildContentTypeAvailability(
			contentType,
			count,
			isGenerating,
			generationMetadata
		);
	} catch (error) {
		return {
			status: "error",
			count: 0,
			isGenerating: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
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
	contentType: FeatureType,
	count: number,
	isWeekGenerating: boolean,
	generationMetadata: WeekContentGenerationMetadata | null
): ContentTypeAvailability {
	// Check if this specific content type is being generated
	const batchInfo = generationMetadata?.batchInfo?.[contentType];
	const isGenerating = isWeekGenerating && batchInfo?.status === "triggered";

	let status: ContentTypeAvailability["status"];
	if (isGenerating) {
		status = "generating";
	} else if (count > 0) {
		status = "available";
	} else {
		status = "none";
	}

	return {
		status,
		count,
		isGenerating,
		batchId: batchInfo?.batchId,
		lastGenerated: generationMetadata?.startedAt
			? new Date(generationMetadata.startedAt)
			: undefined,
	};
}

/**
 * Determine the overall status based on individual content availability
 */
function determineOverallStatus(
	contentAvailability: Record<FeatureType, ContentTypeAvailability>,
	isGenerating: boolean
): "available" | "generating" | "none" | "error" {
	const statuses = Object.values(contentAvailability);

	// If any content has errors, overall status is error
	if (statuses.some((s) => s.status === "error")) {
		return "error";
	}

	// If generation is in progress, overall status is generating
	if (isGenerating || statuses.some((s) => s.isGenerating)) {
		return "generating";
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
 */
export async function isGenerationInProgress(
	courseId: string,
	weekId: string
): Promise<boolean> {
	const [week] = await db
		.select({
			contentGenerationStatus: courseWeeks.contentGenerationStatus,
		})
		.from(courseWeeks)
		.where(and(eq(courseWeeks.id, weekId), eq(courseWeeks.courseId, courseId)));

	return week?.contentGenerationStatus === "processing";
}

/**
 * Get generation progress for a week (if available)
 */
export async function getGenerationProgress(
	courseId: string,
	weekId: string
): Promise<WeekContentGenerationMetadata | null> {
	const [week] = await db
		.select({
			contentGenerationMetadata: courseWeeks.contentGenerationMetadata,
		})
		.from(courseWeeks)
		.where(and(eq(courseWeeks.id, weekId), eq(courseWeeks.courseId, courseId)));

	return week?.contentGenerationMetadata as WeekContentGenerationMetadata | null;
}
