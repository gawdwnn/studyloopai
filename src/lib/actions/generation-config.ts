"use server";

import { db } from "@/db";
import { courseWeekFeatures } from "@/db/schema";
import type {
	FeatureType,
	SelectiveGenerationConfig,
} from "@/types/generation-types";
import { getDefaultConfigForFeature } from "@/types/generation-types";
import { eq } from "drizzle-orm";

/**
 * Persist user's selective generation config to courseweekfeatures table
 * SIMPLIFIED: Direct storage with no hierarchical complexity
 */
export async function persistSelectiveConfig(
	config: SelectiveGenerationConfig,
	weekId: string,
	courseId: string
): Promise<string> {
	try {
		// Simple upsert - update existing config or create new one for this week
		const result = await db
			.insert(courseWeekFeatures)
			.values({
				weekId,
				courseId,
				configData: config,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [courseWeekFeatures.weekId, courseWeekFeatures.courseId],
				set: {
					configData: config,
					updatedAt: new Date(),
				},
			})
			.returning({ id: courseWeekFeatures.id });

		if (!result || result.length === 0) {
			throw new Error("Failed to save generation config - no result returned");
		}

		return result[0].id; // Return courseweekfeatures.id as configId
	} catch (error) {
		console.error("Failed to persist selective config:", error);
		throw error; // Re-throw to let caller handle it
	}
}

/**
 * Get a generation config by its ID (courseweekfeatures.id)
 * UPDATED: Now queries courseweekfeatures instead of generation_configs
 */
export async function getGenerationConfigById(
	configId: string
): Promise<SelectiveGenerationConfig | null> {
	const result = await db
		.select({
			configData: courseWeekFeatures.configData,
		})
		.from(courseWeekFeatures)
		.where(eq(courseWeekFeatures.id, configId))
		.limit(1);

	const config = result[0];
	if (!config) {
		return null;
	}

	return config.configData;
}

/**
 * Get specific feature configuration for background jobs
 * UPDATED: Now queries courseweekfeatures instead of generation_configs
 */
export async function getFeatureGenerationConfig<T extends FeatureType>(
	configId: string,
	featureType: T
): Promise<SelectiveGenerationConfig["featureConfigs"][T] | null> {
	// Get the full config first
	const config = await getGenerationConfigById(configId);
	if (!config || !config.selectedFeatures[featureType]) {
		return null; // Feature not selected
	}

	return (
		config.featureConfigs[featureType] ||
		getDefaultConfigForFeature(featureType)
	);
}
