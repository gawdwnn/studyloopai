"use server";

import { db } from "@/db";
import { type configurationSource, generationConfigs } from "@/db/schema";
import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { eq, sql } from "drizzle-orm";

/**
 * Persist user's selective generation config to database
 * This creates a historical record of what config was used for this specific generation
 */
export async function persistSelectiveConfig(
	config: SelectiveGenerationConfig,
	weekId: string,
	courseId: string,
	userId: string,
	configSource: (typeof configurationSource.enumValues)[number],
	metadata: {
		source: string;
		trigger: string;
		userAgent: string;
		[key: string]: string | string[] | undefined;
	}
): Promise<string> {
	// Prepare metadata - all callers must provide required fields
	const configMetadata = {
		timestamp: new Date().toISOString(),
		...metadata,
	};

	// Update existing config or insert new one using upsert pattern
	const [savedConfig] = await db
		.insert(generationConfigs)
		.values({
			weekId,
			courseId,
			configSource,
			configData: config,
			createdBy: userId,
			isActive: true,
			metadata: configMetadata,
		})
		.onConflictDoUpdate({
			target: [generationConfigs.weekId, generationConfigs.configSource],
			set: {
				configData: config,
				updatedAt: sql`now()`,
				metadata: configMetadata,
				isActive: true,
				createdBy: userId,
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
