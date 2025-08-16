"use server";

import { db } from "@/db";
import { courseMaterials, courseWeekFeatures } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/utils/error-handling";
import type { CourseMaterial } from "@/types/database-types";
import type { FeatureAvailability } from "@/types/generation-types";
import { and, eq } from "drizzle-orm";

/**
 * Transform database record to FeatureAvailability structure
 * Shared utility to eliminate duplicate transformation logic
 */
function transformToFeatureAvailability(
	record: typeof courseWeekFeatures.$inferSelect
): FeatureAvailability {
	return {
		cuecards: {
			generated: record.cuecardsGenerated ?? false,
			count: record.cuecardsCount ?? 0,
			generatedAt: record.cuecardsGeneratedAt,
		},
		mcqs: {
			generated: record.mcqsGenerated ?? false,
			count: record.mcqsCount ?? 0,
			generatedAt: record.mcqsGeneratedAt,
		},
		openQuestions: {
			generated: record.openQuestionsGenerated ?? false,
			count: record.openQuestionsCount ?? 0,
			generatedAt: record.openQuestionsGeneratedAt,
		},
		summaries: {
			generated: record.summariesGenerated ?? false,
			count: record.summariesCount ?? 0,
			generatedAt: record.summariesGeneratedAt,
		},
		goldenNotes: {
			generated: record.goldenNotesGenerated ?? false,
			count: record.goldenNotesCount ?? 0,
			generatedAt: record.goldenNotesGeneratedAt,
		},
		conceptMaps: {
			generated: record.conceptMapsGenerated ?? false,
			count: record.conceptMapsCount ?? 0,
			generatedAt: record.conceptMapsGeneratedAt,
		},
	};
}

/**
 * Comprehensive status tracking for a specific course material and its week features
 * Combines data from both courseMaterials and courseWeekFeatures tables
 * @param courseId - The course ID to query
 * @param weekId - The week ID to query
 * @param materialId - The specific material ID to track
 * @returns Combined status data for the specific material and its week features
 */
export async function getStatusTrackingData(
	courseId: string,
	weekId: string,
	materialId: string
): Promise<{
	material: Pick<
		CourseMaterial,
		"id" | "uploadStatus" | "embeddingStatus" | "fileName" | "title"
	> | null;
	weekFeatures: { generationStatus: string | null } | null;
} | null> {
	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			// Fetch specific course material data (Phase 1 tracking)
			const materials = await db
				.select({
					id: courseMaterials.id,
					uploadStatus: courseMaterials.uploadStatus,
					embeddingStatus: courseMaterials.embeddingStatus,
					fileName: courseMaterials.fileName,
					title: courseMaterials.title,
				})
				.from(courseMaterials)
				.where(
					and(
						eq(courseMaterials.courseId, courseId),
						eq(courseMaterials.weekId, weekId),
						eq(courseMaterials.id, materialId)
					)
				);

			// Fetch week features data (Phase 2 tracking)
			const features = await db
				.select({
					generationStatus: courseWeekFeatures.generationStatus,
				})
				.from(courseWeekFeatures)
				.where(
					and(
						eq(courseWeekFeatures.courseId, courseId),
						eq(courseWeekFeatures.weekId, weekId)
					)
				);

			return {
				material: materials[0] || null,
				weekFeatures: features[0] || null,
			};
		},
		"getStatusTrackingData",
		null
	);
}

/**
 * Unified server action for getting feature availability
 * Handles both single week and full course queries efficiently
 *
 * @param courseId - The course ID to query
 * @param weekId - Optional week ID for single week query
 * @returns For single week: FeatureAvailability | null
 *          For full course: Record<string, FeatureAvailability>
 */
export async function getFeatureAvailability(
	courseId: string,
	weekId?: string
): Promise<FeatureAvailability | Record<string, FeatureAvailability> | null> {
	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();

			if (!user) {
				throw new Error("Authentication required");
			}

			// Build query conditions based on parameters
			const conditions = weekId
				? and(
						eq(courseWeekFeatures.courseId, courseId),
						eq(courseWeekFeatures.weekId, weekId)
					)
				: eq(courseWeekFeatures.courseId, courseId);

			// Execute optimized query
			const features = await db
				.select()
				.from(courseWeekFeatures)
				.where(conditions);

			// Handle single week query
			if (weekId) {
				if (!features[0]) {
					return null;
				}
				return transformToFeatureAvailability(features[0]);
			}

			// Handle full course query
			const availability: Record<string, FeatureAvailability> = {};
			for (const feature of features) {
				availability[feature.weekId] = transformToFeatureAvailability(feature);
			}

			return availability;
		},
		"getFeatureAvailability",
		weekId ? null : {} // Fallback value matches the no-user return pattern
	);
}

/**
 * Initialize feature tracking for a course week
 */
export async function initializeFeatureTracking(
	courseId: string,
	weekId: string
): Promise<void> {
	return await withErrorHandling(
		async () => {
			const {
				data: { user },
			} = await (await getServerClient()).auth.getUser();
			if (!user) {
				throw new Error("Authentication required");
			}

			// Upsert feature tracking record
			await db
				.insert(courseWeekFeatures)
				.values({
					courseId,
					weekId,
					// configId now stored in configData JSONB column
				})
				.onConflictDoUpdate({
					target: [courseWeekFeatures.courseId, courseWeekFeatures.weekId],
					set: {
						// configId now tracked via configData JSONB column
						updatedAt: new Date(),
					},
				});
		},
		"initializeFeatureTracking",
		undefined // void function, so return undefined on error
	);
}
