"use server";

import { db } from "@/db";
import { courseWeekFeatures } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";

export interface FeatureStatus {
	generated: boolean;
	count: number;
	generatedAt: Date | null;
}

export interface WeekFeatureAvailability {
	cuecards: FeatureStatus;
	mcqs: FeatureStatus;
	openQuestions: FeatureStatus;
	summaries: FeatureStatus;
	goldenNotes: FeatureStatus;
	conceptMaps: FeatureStatus;
}

/**
 * Get feature availability status for a course
 */
export async function getFeatureAvailability(
	courseId: string
): Promise<Record<string, WeekFeatureAvailability>> {
	const {
		data: { user },
	} = await (await getServerClient()).auth.getUser();
	if (!user) {
		throw new Error("Authentication required");
	}

	// Get all course week features for this course
	const features = await db
		.select()
		.from(courseWeekFeatures)
		.where(eq(courseWeekFeatures.courseId, courseId));

	const availability: Record<string, WeekFeatureAvailability> = {};

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
