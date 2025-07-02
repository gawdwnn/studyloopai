/**
 * Generation Configuration Management System
 * Core system for managing AI content generation settings
 * Designed for adaptive learning and learning gap algorithms
 */

import { db } from "@/db";
import { courses, generationConfigs, userProgress, users } from "@/db/schema";
import { and, count, eq, sql } from "drizzle-orm";
import { z } from "zod";

// Base generation configuration schema
export const GenerationConfigSchema = z.object({
	goldenNotesCount: z.number().min(1).max(20).default(5),
	flashcardsCount: z.number().min(1).max(50).default(10),
	summaryLength: z.number().min(100).max(2000).default(300),
	examExercisesCount: z.number().min(1).max(20).default(3),
	mcqExercisesCount: z.number().min(1).max(30).default(5),
	difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
	focus: z.enum(["conceptual", "practical", "mixed"]).default("mixed"),
});

export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;

// Adaptive configuration based on user performance
export interface AdaptiveGenerationConfig extends GenerationConfig {
	adaptiveFactors: {
		userPerformanceLevel: "struggling" | "average" | "excelling";
		learningGaps: string[]; // Content types where user is struggling
		preferredDifficulty: "beginner" | "intermediate" | "advanced";
		contentTypePreferences: Record<string, number>; // User engagement scores
		lastPerformanceScore: number;
		streakCount: number;
	};
	adaptationReason: string;
}

// Configuration sources for different contexts
export enum ConfigurationSource {
	USER_PREFERENCE = "user_preference", // From user profile settings
	COURSE_DEFAULT = "course_default", // From course-level settings
	MATERIAL_OVERRIDE = "material_override", // From upload wizard
	ADAPTIVE_ALGORITHM = "adaptive_algorithm", // From learning algorithm
	SYSTEM_DEFAULT = "system_default", // Fallback defaults
}

// Configuration priority system (higher number = higher priority)
const CONFIG_PRIORITY = {
	[ConfigurationSource.ADAPTIVE_ALGORITHM]: 100,
	[ConfigurationSource.MATERIAL_OVERRIDE]: 80,
	[ConfigurationSource.USER_PREFERENCE]: 60,
	[ConfigurationSource.COURSE_DEFAULT]: 40,
	[ConfigurationSource.SYSTEM_DEFAULT]: 20,
};

/**
 * Get system default configuration
 */
export function getSystemDefaultConfig(): GenerationConfig {
	return GenerationConfigSchema.parse({});
}

/**
 * Get user's preferred configuration from their profile
 */
export async function getUserPreferredConfig(userId: string): Promise<GenerationConfig | null> {
	try {
		const user = await db
			.select({ preferences: users.preferences })
			.from(users)
			.where(eq(users.userId, userId))
			.limit(1);

		if (!user[0]?.preferences) return null;

		const preferences = user[0].preferences as {
			generationConfig: GenerationConfig;
		};
		if (!preferences.generationConfig) return null;

		return GenerationConfigSchema.parse(preferences.generationConfig);
	} catch {
		return null;
	}
}

/**
 * Get course-level default configuration
 */
export async function getCourseDefaultConfig(courseId: string): Promise<GenerationConfig | null> {
	try {
		const course = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);

		if (!course[0]) return null;

		// Extract generation config from course metadata if it exists
		// This would be set by instructors for their courses
		return null; // Placeholder - implement when course-level configs are added
	} catch {
		return null;
	}
}

/**
 * Get active generation configuration for a material
 */
export async function getActiveGenerationConfig(
	materialId: string
): Promise<GenerationConfig | null> {
	try {
		const config = await db
			.select()
			.from(generationConfigs)
			.where(
				and(eq(generationConfigs.materialId, materialId), eq(generationConfigs.isActive, true))
			)
			.orderBy(sql`${generationConfigs.appliedAt} DESC`)
			.limit(1);

		if (!config[0]) return null;

		return GenerationConfigSchema.parse({
			goldenNotesCount: config[0].goldenNotesCount,
			flashcardsCount: config[0].flashcardsCount,
			summaryLength: config[0].summaryLength,
			examExercisesCount: config[0].examExercisesCount,
			mcqExercisesCount: config[0].mcqExercisesCount,
			difficulty: config[0].difficulty,
			focus: config[0].focus,
		});
	} catch {
		return null;
	}
}

/**
 * Analyze user performance to determine adaptive factors
 */
export async function analyzeUserPerformance(userId: string, _materialId?: string) {
	try {
		// Get user's overall progress statistics
		const progressStats = await db
			.select({
				contentType: userProgress.contentType,
				avgScore: sql<number>`AVG(CAST(${userProgress.score} AS DECIMAL))`,
				totalAttempts: sql<number>`SUM(${userProgress.attempts})`,
				completedCount: count(),
			})
			.from(userProgress)
			.where(eq(userProgress.userId, userId))
			.groupBy(userProgress.contentType);

		// Calculate overall performance level
		const overallScore =
			progressStats.reduce((sum, stat) => sum + (stat.avgScore || 0), 0) /
			Math.max(progressStats.length, 1);

		let performanceLevel: "struggling" | "average" | "excelling";
		if (overallScore < 60) performanceLevel = "struggling";
		else if (overallScore < 80) performanceLevel = "average";
		else performanceLevel = "excelling";

		// Identify learning gaps (content types with low performance)
		const learningGaps = progressStats
			.filter((stat) => (stat.avgScore || 0) < 70)
			.map((stat) => stat.contentType);

		// Determine preferred difficulty based on performance
		let preferredDifficulty: "beginner" | "intermediate" | "advanced";
		if (overallScore < 50) preferredDifficulty = "beginner";
		else if (overallScore < 85) preferredDifficulty = "intermediate";
		else preferredDifficulty = "advanced";

		// Calculate content type preferences (engagement scores)
		const contentTypePreferences: Record<string, number> = {};
		for (const stat of progressStats) {
			// Score based on completion rate and average score
			const engagementScore = ((stat.avgScore || 0) + stat.completedCount * 10) / 2;
			contentTypePreferences[stat.contentType] = engagementScore;
		}

		// Get most recent performance score
		const recentProgress = await db
			.select({ score: userProgress.score })
			.from(userProgress)
			.where(eq(userProgress.userId, userId))
			.orderBy(sql`${userProgress.lastAttemptAt} DESC`)
			.limit(1);

		const lastPerformanceScore = recentProgress[0]?.score || 0;

		// Calculate streak count (consecutive completed items)
		const streakCount = 0; // TODO: Implement streak calculation

		return {
			userPerformanceLevel: performanceLevel,
			learningGaps,
			preferredDifficulty,
			contentTypePreferences,
			lastPerformanceScore,
			streakCount,
		};
	} catch (error) {
		console.error("Failed to analyze user performance:", error);
		return {
			userPerformanceLevel: "average" as const,
			learningGaps: [],
			preferredDifficulty: "intermediate" as const,
			contentTypePreferences: {},
			lastPerformanceScore: 75,
			streakCount: 0,
		};
	}
}

/**
 * Generate adaptive configuration based on user performance
 */
export async function generateAdaptiveConfig(
	userId: string,
	baseConfig: GenerationConfig,
	materialId?: string
): Promise<AdaptiveGenerationConfig> {
	const adaptiveFactors = await analyzeUserPerformance(userId, materialId);

	// Start with base configuration
	const adaptedConfig = { ...baseConfig };
	let adaptationReason = "Base configuration";

	// Adapt based on performance level
	if (adaptiveFactors.userPerformanceLevel === "struggling") {
		adaptedConfig.difficulty = "beginner";
		adaptedConfig.flashcardsCount = Math.min(adaptedConfig.flashcardsCount + 5, 20); // More practice
		adaptedConfig.goldenNotesCount = Math.min(adaptedConfig.goldenNotesCount + 2, 10); // More key concepts
		adaptedConfig.focus = "conceptual"; // Focus on understanding
		adaptationReason = "Increased practice materials for struggling performance";
	} else if (adaptiveFactors.userPerformanceLevel === "excelling") {
		adaptedConfig.difficulty = "advanced";
		adaptedConfig.examExercisesCount = Math.min(adaptedConfig.examExercisesCount + 2, 8); // More challenging questions
		adaptedConfig.focus = "practical"; // Focus on application
		adaptationReason = "Increased challenge for excellent performance";
	}

	// Adapt based on learning gaps
	if (adaptiveFactors.learningGaps.includes("flashcard")) {
		adaptedConfig.flashcardsCount = Math.min(adaptedConfig.flashcardsCount + 10, 30);
		adaptationReason += " | Increased flashcards to address learning gap";
	}
	if (adaptiveFactors.learningGaps.includes("mcq")) {
		adaptedConfig.mcqExercisesCount = Math.min(adaptedConfig.mcqExercisesCount + 5, 20);
		adaptationReason += " | Increased MCQs to address learning gap";
	}

	// Use preferred difficulty if significantly different
	if (adaptiveFactors.preferredDifficulty !== adaptedConfig.difficulty) {
		adaptedConfig.difficulty = adaptiveFactors.preferredDifficulty;
		adaptationReason += ` | Adjusted difficulty to ${adaptiveFactors.preferredDifficulty}`;
	}

	return {
		...adaptedConfig,
		adaptiveFactors,
		adaptationReason,
	};
}

/**
 * Get the final configuration for a material with full priority system
 */
export async function getEffectiveGenerationConfig(
	userId: string,
	materialId: string,
	courseId?: string
): Promise<AdaptiveGenerationConfig> {
	// Collect configurations from all sources
	const configs = new Map<ConfigurationSource, GenerationConfig>();

	// System default (always present)
	configs.set(ConfigurationSource.SYSTEM_DEFAULT, getSystemDefaultConfig());

	// User preference
	const userConfig = await getUserPreferredConfig(userId);
	if (userConfig) {
		configs.set(ConfigurationSource.USER_PREFERENCE, userConfig);
	}

	// Course default
	if (courseId) {
		const courseConfig = await getCourseDefaultConfig(courseId);
		if (courseConfig) {
			configs.set(ConfigurationSource.COURSE_DEFAULT, courseConfig);
		}
	}

	// Active material config
	const materialConfig = await getActiveGenerationConfig(materialId);
	if (materialConfig) {
		configs.set(ConfigurationSource.MATERIAL_OVERRIDE, materialConfig);
	}

	// Merge configurations by priority
	const mergedConfig = mergeConfigurationsByPriority(configs);

	// Apply adaptive algorithm
	return await generateAdaptiveConfig(userId, mergedConfig, materialId);
}

/**
 * Merge configurations based on priority system
 */
function mergeConfigurationsByPriority(
	configs: Map<ConfigurationSource, GenerationConfig>
): GenerationConfig {
	// Sort by priority (highest first)
	const sortedConfigs = Array.from(configs.entries()).sort(
		([a], [b]) => CONFIG_PRIORITY[b] - CONFIG_PRIORITY[a]
	);

	// Start with system default
	const mergedConfig = configs.get(ConfigurationSource.SYSTEM_DEFAULT) || getSystemDefaultConfig();

	// Apply each configuration in priority order
	for (const [source, config] of sortedConfigs) {
		if (source === ConfigurationSource.SYSTEM_DEFAULT) continue;

		// Merge non-undefined values
		for (const key of Object.keys(config)) {
			const configKey = key as keyof GenerationConfig;
			if (config[configKey] !== undefined) {
				(mergedConfig as Record<keyof GenerationConfig, GenerationConfig[keyof GenerationConfig]>)[
					configKey
				] = config[configKey] as GenerationConfig[typeof configKey];
			}
		}
	}

	return mergedConfig;
}

/**
 * Save user's preferred configuration
 */
export async function saveUserPreferredConfig(
	userId: string,
	config: GenerationConfig
): Promise<boolean> {
	try {
		// Validate configuration
		const validatedConfig = GenerationConfigSchema.parse(config);

		// Update user preferences
		await db
			.update(users)
			.set({
				preferences: sql`COALESCE(preferences, '{}') || ${JSON.stringify({ generationConfig: validatedConfig })}`,
				updatedAt: new Date(),
			})
			.where(eq(users.userId, userId));

		return true;
	} catch (error) {
		console.error("Failed to save user preferred config:", error);
		return false;
	}
}

/**
 * Save material generation configuration from upload wizard
 */
export async function saveMaterialGenerationConfig(
	materialId: string,
	userId: string,
	config: GenerationConfig
): Promise<boolean> {
	try {
		// Deactivate previous configs for this material
		await db
			.update(generationConfigs)
			.set({ isActive: false })
			.where(eq(generationConfigs.materialId, materialId));

		// Insert new material-level config
		await db.insert(generationConfigs).values({
			materialId,
			userId,
			configSource: ConfigurationSource.MATERIAL_OVERRIDE,
			goldenNotesCount: config.goldenNotesCount,
			flashcardsCount: config.flashcardsCount,
			summaryLength: config.summaryLength,
			examExercisesCount: config.examExercisesCount,
			mcqExercisesCount: config.mcqExercisesCount,
			difficulty: config.difficulty,
			focus: config.focus,
			isActive: true,
		});

		return true;
	} catch (error) {
		console.error("Failed to save material generation config:", error);
		return false;
	}
}

/**
 * Save adaptive generation configuration
 */
export async function saveAdaptiveGenerationConfig(
	materialId: string,
	userId: string,
	config: AdaptiveGenerationConfig
): Promise<boolean> {
	try {
		// Deactivate previous configs for this material
		await db
			.update(generationConfigs)
			.set({ isActive: false })
			.where(eq(generationConfigs.materialId, materialId));

		// Insert new adaptive config
		await db.insert(generationConfigs).values({
			materialId,
			userId,
			configSource: ConfigurationSource.ADAPTIVE_ALGORITHM,
			goldenNotesCount: config.goldenNotesCount,
			flashcardsCount: config.flashcardsCount,
			summaryLength: config.summaryLength,
			examExercisesCount: config.examExercisesCount,
			mcqExercisesCount: config.mcqExercisesCount,
			difficulty: config.difficulty,
			focus: config.focus,
			adaptationReason: config.adaptationReason,
			userPerformanceLevel: config.adaptiveFactors.userPerformanceLevel,
			learningGaps: config.adaptiveFactors.learningGaps,
			isActive: true,
		});

		return true;
	} catch (error) {
		console.error("Failed to save adaptive generation config:", error);
		return false;
	}
}

/**
 * Get configuration usage analytics for optimization
 */
export async function getConfigurationAnalytics(userId?: string) {
	try {
		// Get configuration usage from generationConfigs table instead of processingMetadata
		const configUsage = await db
			.select({
				difficulty: generationConfigs.difficulty,
				focus: generationConfigs.focus,
				configSource: generationConfigs.configSource,
				appliedAt: generationConfigs.appliedAt,
			})
			.from(generationConfigs)
			.where(userId ? eq(generationConfigs.userId, userId) : undefined);

		// Analyze configuration patterns
		const configPatterns = configUsage.reduce(
			(acc, config) => {
				const key = `${config.difficulty}-${config.focus}`;
				acc[key] = (acc[key] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		return {
			totalMaterials: configUsage.length,
			configurationPatterns: configPatterns,
			mostCommonConfig: Object.entries(configPatterns).sort(([, a], [, b]) => b - a)[0]?.[0],
		};
	} catch (error) {
		console.error("Failed to get configuration analytics:", error);
		return {
			totalMaterials: 0,
			configurationPatterns: {},
			mostCommonConfig: null,
		};
	}
}
