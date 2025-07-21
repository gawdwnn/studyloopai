"use server";

import { db } from "@/db";
import { generationConfigs } from "@/db/schema";
import type { GenerationConfig } from "@/types/database-types";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { and, eq, sql } from "drizzle-orm";

/**
 * Persist user's selective generation config to database
 * This creates a historical record of what config was used for this specific generation
 */
export async function persistSelectiveConfig(
	config: SelectiveGenerationConfig,
	weekId: string,
	courseId: string,
	userId: string
): Promise<string> {
	// Deactivate any existing week-level config for this week
	await db
		.update(generationConfigs)
		.set({ isActive: false, updatedAt: sql`now()` })
		.where(
			and(
				eq(generationConfigs.weekId, weekId),
				eq(generationConfigs.configSource, "course_week_override")
			)
		);

	// Insert new week-level config
	const [savedConfig] = await db
		.insert(generationConfigs)
		.values({
			weekId,
			courseId,
			userId,
			configSource: "course_week_override",
			configData: config,
			createdBy: userId,
			isActive: true,
			metadata: {
				source: "user_material_upload",
				timestamp: new Date().toISOString(),
				userAgent: "course-material-upload-wizard",
			},
		})
		.returning({ id: generationConfigs.id });

	return savedConfig.id;
}

/**
 * Get a generation config by its ID
 * Used by generator jobs to fetch their specific configuration
 */
export async function getGenerationConfigById(
	configId: string
): Promise<SelectiveGenerationConfig | null> {
	const result = await db
		.select({
			configData: generationConfigs.configData,
			isActive: generationConfigs.isActive,
		})
		.from(generationConfigs)
		.where(eq(generationConfigs.id, configId))
		.limit(1);

	const config = result[0];
	if (!config || !config.isActive) {
		return null;
	}

	return config.configData;
}

/**
 * Get generation config with full status information
 * Used for status tracking and monitoring
 */
export async function getGenerationConfigWithStatus(
	configId: string
): Promise<{
	configData: SelectiveGenerationConfig;
	isActive: boolean;
	generationStatus: string;
	generationStartedAt: Date | null;
	generationCompletedAt: Date | null;
	failedFeatures: string[];
} | null> {
	const result = await db
		.select({
			configData: generationConfigs.configData,
			isActive: generationConfigs.isActive,
			generationStatus: generationConfigs.generationStatus,
			generationStartedAt: generationConfigs.generationStartedAt,
			generationCompletedAt: generationConfigs.generationCompletedAt,
			failedFeatures: generationConfigs.failedFeatures,
		})
		.from(generationConfigs)
		.where(eq(generationConfigs.id, configId))
		.limit(1);

	const config = result[0];
	if (!config) {
		return null;
	}

	return {
		configData: config.configData as SelectiveGenerationConfig,
		isActive: config.isActive || false,
		generationStatus: config.generationStatus || "pending",
		generationStartedAt: config.generationStartedAt,
		generationCompletedAt: config.generationCompletedAt,
		failedFeatures: (config.failedFeatures as string[]) || [],
	};
}

/**
 * Get active generation configs for a specific week
 * Used to check if generation is currently in progress
 */
export async function getActiveGenerationConfigsForWeek(
	courseId: string,
	weekId: string
): Promise<Array<{
	id: string;
	generationStatus: string;
	generationStartedAt: Date | null;
	selectedFeatures: SelectiveGenerationConfig["selectedFeatures"];
}>> {
	const result = await db
		.select({
			id: generationConfigs.id,
			generationStatus: generationConfigs.generationStatus,
			generationStartedAt: generationConfigs.generationStartedAt,
			configData: generationConfigs.configData,
		})
		.from(generationConfigs)
		.where(
			and(
				eq(generationConfigs.courseId, courseId),
				eq(generationConfigs.weekId, weekId),
				eq(generationConfigs.isActive, true)
			)
		);

	return result.map((config) => ({
		id: config.id,
		generationStatus: config.generationStatus || "pending",
		generationStartedAt: config.generationStartedAt,
		selectedFeatures: (config.configData as SelectiveGenerationConfig)?.selectedFeatures || {},
	}));
}

/**
 * Get a generation config by ID with specific feature config
 * Useful for generators that only need their specific config portion
 */
export async function getFeatureGenerationConfig<
	T extends keyof SelectiveGenerationConfig["featureConfigs"],
>(
	configId: string,
	feature: T
): Promise<SelectiveGenerationConfig["featureConfigs"][T] | null> {
	const config = await getGenerationConfigById(configId);
	if (!config) return null;

	// Check if feature is enabled
	if (!config.selectedFeatures[feature]) return null;

	return config.featureConfigs[feature] || null;
}

/**
 * Get the full generation config database record by ID
 * This demonstrates using Drizzle's inferred types for the full record
 */
export async function getGenerationConfigRecord(
	configId: string
): Promise<GenerationConfig | null> {
	const result = await db
		.select()
		.from(generationConfigs)
		.where(eq(generationConfigs.id, configId))
		.limit(1);

	const config = result[0];
	if (!config || !config.isActive) {
		return null;
	}

	return config;
}
