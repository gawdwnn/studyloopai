"use server";

import { db } from "@/db";
import { courseWeekFeatures } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import type { FeatureAvailability } from "@/types/generation-types";
import { and, eq } from "drizzle-orm";

// TODO: fix server actions used in use-feature-availability hook
/**
 * Get feature availability status for a course
 */
export async function getFeatureAvailability(
	courseId: string
): Promise<Record<string, FeatureAvailability>> {
	const {
		data: { user },
	} = await (await getServerClient()).auth.getUser();
	if (!user) {
		// Return empty availability for unauthenticated users (data fetching)
		return {};
	}

	// Get all course week features for this course
	const features = await db
		.select()
		.from(courseWeekFeatures)
		.where(eq(courseWeekFeatures.courseId, courseId));

	const availability: Record<string, FeatureAvailability> = {};

	for (const feature of features) {
		availability[feature.weekId] = {
			cuecards: {
				generated: feature.cuecardsGenerated ?? false,
				count: feature.cuecardsCount ?? 0,
				generatedAt: feature.cuecardsGeneratedAt,
			},
			mcqs: {
				generated: feature.mcqsGenerated ?? false,
				count: feature.mcqsCount ?? 0,
				generatedAt: feature.mcqsGeneratedAt,
			},
			openQuestions: {
				generated: feature.openQuestionsGenerated ?? false,
				count: feature.openQuestionsCount ?? 0,
				generatedAt: feature.openQuestionsGeneratedAt,
			},
			summaries: {
				generated: feature.summariesGenerated ?? false,
				count: feature.summariesCount ?? 0,
				generatedAt: feature.summariesGeneratedAt,
			},
			goldenNotes: {
				generated: feature.goldenNotesGenerated ?? false,
				count: feature.goldenNotesCount ?? 0,
				generatedAt: feature.goldenNotesGeneratedAt,
			},
			conceptMaps: {
				generated: feature.conceptMapsGenerated ?? false,
				count: feature.conceptMapsCount ?? 0,
				generatedAt: feature.conceptMapsGeneratedAt,
			},
		};
	}

	return availability;
}
// TODO: fix server actions used in use-feature-availability hook
/**
 * Get feature availability status for a specific course week (optimized single query)
 */
export async function getCourseWeekFeatureAvailability(
	courseId: string,
	weekId: string
): Promise<FeatureAvailability | null> {
	const {
		data: { user },
	} = await (await getServerClient()).auth.getUser();
	if (!user) {
		throw new Error("Authentication required");
	}

	// Query specific course week feature using composite key
	const feature = await db
		.select()
		.from(courseWeekFeatures)
		.where(
			and(
				eq(courseWeekFeatures.courseId, courseId),
				eq(courseWeekFeatures.weekId, weekId)
			)
		)
		.limit(1);

	if (!feature[0]) {
		return null;
	}

	const f = feature[0];
	return {
		cuecards: {
			generated: f.cuecardsGenerated ?? false,
			count: f.cuecardsCount ?? 0,
			generatedAt: f.cuecardsGeneratedAt,
		},
		mcqs: {
			generated: f.mcqsGenerated ?? false,
			count: f.mcqsCount ?? 0,
			generatedAt: f.mcqsGeneratedAt,
		},
		openQuestions: {
			generated: f.openQuestionsGenerated ?? false,
			count: f.openQuestionsCount ?? 0,
			generatedAt: f.openQuestionsGeneratedAt,
		},
		summaries: {
			generated: f.summariesGenerated ?? false,
			count: f.summariesCount ?? 0,
			generatedAt: f.summariesGeneratedAt,
		},
		goldenNotes: {
			generated: f.goldenNotesGenerated ?? false,
			count: f.goldenNotesCount ?? 0,
			generatedAt: f.goldenNotesGeneratedAt,
		},
		conceptMaps: {
			generated: f.conceptMapsGenerated ?? false,
			count: f.conceptMapsCount ?? 0,
			generatedAt: f.conceptMapsGeneratedAt,
		},
	};
}

/**
 * Initialize feature tracking for a course week
 */
export async function initializeFeatureTracking(
	courseId: string,
	weekId: string,
	configId?: string
): Promise<void> {
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
			lastGenerationConfigId: configId,
		})
		.onConflictDoUpdate({
			target: [courseWeekFeatures.courseId, courseWeekFeatures.weekId],
			set: {
				lastGenerationConfigId: configId,
				updatedAt: new Date(),
			},
		});
}
