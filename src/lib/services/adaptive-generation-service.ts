/**
 * Generation Configuration Management System
 * Core system for managing AI content generation settings
 * Designed for adaptive learning and learning gap algorithms
 */

import { db } from "@/db";
import { generationConfigs, userProgress, users } from "@/db/schema";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

// Base generation configuration schema
export const GenerationConfigSchema = z.object({
	goldenNotesCount: z.number().min(1).max(20).default(5),
	cuecardsCount: z.number().min(1).max(50).default(10),
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

// Configuration sources for different contexts - matches DB enum
export enum ConfigurationSource {
	USER_PREFERENCE = "user_preference", // From user profile settings
	COURSE_DEFAULT = "course_default", // From course-level settings
	COURSE_WEEK_OVERRIDE = "course_week_override", // From course-week-level settings
	ADAPTIVE_ALGORITHM = "adaptive_algorithm", // From learning algorithm
	SYSTEM_DEFAULT = "system_default", // Fallback defaults
	INSTITUTION_DEFAULT = "institution_default", // Future: institution-level defaults
}

// Configuration priority system (higher number = higher priority)
const CONFIG_PRIORITY = {
	[ConfigurationSource.ADAPTIVE_ALGORITHM]: 100,
	[ConfigurationSource.COURSE_WEEK_OVERRIDE]: 80,
	[ConfigurationSource.USER_PREFERENCE]: 60,
	[ConfigurationSource.COURSE_DEFAULT]: 40,
	[ConfigurationSource.INSTITUTION_DEFAULT]: 30, // Future: institution-level defaults
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
		// First try to get from new unified config table
		const config = await db
			.select({ configData: generationConfigs.configData })
			.from(generationConfigs)
			.where(
				and(
					eq(generationConfigs.userId, userId),
					eq(generationConfigs.configSource, ConfigurationSource.USER_PREFERENCE),
					eq(generationConfigs.isActive, true)
				)
			)
			.limit(1);

		if (config[0]?.configData) {
			return GenerationConfigSchema.parse(config[0].configData);
		}

		// Fallback to user preferences table for backward compatibility
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
		const config = await db
			.select({ configData: generationConfigs.configData })
			.from(generationConfigs)
			.where(
				and(
					eq(generationConfigs.courseId, courseId),
					eq(generationConfigs.configSource, ConfigurationSource.COURSE_DEFAULT),
					eq(generationConfigs.isActive, true),
					isNull(generationConfigs.weekId) // Course-level, not week-specific
				)
			)
			.limit(1);

		if (config[0]?.configData) {
			return GenerationConfigSchema.parse(config[0].configData);
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Get active generation configuration for a week
 */
export async function getActiveWeekGenerationConfig(
	weekId: string
): Promise<GenerationConfig | null> {
	try {
		const config = await db
			.select({ configData: generationConfigs.configData })
			.from(generationConfigs)
			.where(
				and(
					eq(generationConfigs.weekId, weekId),
					eq(generationConfigs.configSource, ConfigurationSource.COURSE_WEEK_OVERRIDE),
					eq(generationConfigs.isActive, true)
				)
			)
			.orderBy(sql`${generationConfigs.appliedAt} DESC`)
			.limit(1);

		if (config[0]?.configData) {
			return GenerationConfigSchema.parse(config[0].configData);
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Analyze user performance to determine adaptive factors
 */
export async function analyzeUserPerformance(userId: string, _weekId?: string) {
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

		// TODO: Implement streak calculation when needed
		const streakCount = 0;

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
		// Return safe defaults when analysis fails
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
	weekId?: string
): Promise<AdaptiveGenerationConfig> {
	const adaptiveFactors = await analyzeUserPerformance(userId, weekId);

	// Start with base configuration
	const adaptedConfig = { ...baseConfig };
	let adaptationReason = "Base configuration";

	// Adapt based on performance level
	if (adaptiveFactors.userPerformanceLevel === "struggling") {
		adaptedConfig.difficulty = "beginner";
		adaptedConfig.cuecardsCount = Math.min(adaptedConfig.cuecardsCount + 5, 20);
		adaptedConfig.goldenNotesCount = Math.min(adaptedConfig.goldenNotesCount + 2, 10);
		adaptedConfig.focus = "conceptual";
		adaptationReason = "Increased practice materials for struggling performance";
	} else if (adaptiveFactors.userPerformanceLevel === "excelling") {
		adaptedConfig.difficulty = "advanced";
		adaptedConfig.examExercisesCount = Math.min(adaptedConfig.examExercisesCount + 2, 8);
		adaptedConfig.focus = "practical";
		adaptationReason = "Increased challenge for excellent performance";
	}

	// Adapt based on learning gaps
	if (adaptiveFactors.learningGaps.includes("cuecard")) {
		adaptedConfig.cuecardsCount = Math.min(adaptedConfig.cuecardsCount + 10, 30);
		adaptationReason += " | Increased cuecards to address learning gap";
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
 * Get the final configuration for a week with full priority system
 * This is the main entry point used by all content generation jobs
 *
 * Priority order (highest to lowest):
 * 1. Adaptive Algorithm (100) - AI-driven adjustments based on performance
 * 2. Week Override (80) - Settings from week-level configuration
 * 3. User Preference (60) - User's default settings
 * 4. Course Default (40) - Course-level instructor settings
 * 5. Institution Default (30) - Institution-level defaults (future)
 * 6. System Default (20) - Application fallback defaults
 *
 * @param userId - User ID for personalization and adaptive learning
 * @param weekId - Course week ID to get specific configuration
 * @param courseId - Course ID for course-level defaults
 * @returns Promise<AdaptiveGenerationConfig> - Final merged and adapted configuration
 */
export async function getEffectiveCourseWeekGenerationConfig(
	userId: string,
	weekId: string,
	courseId: string,
	institutionId?: string
): Promise<AdaptiveGenerationConfig> {
	// Collect configurations from all sources
	const configs = new Map<ConfigurationSource, GenerationConfig>();

	// System default (always present)
	configs.set(ConfigurationSource.SYSTEM_DEFAULT, getSystemDefaultConfig());

	// Institution default (future)
	if (institutionId) {
		const institutionConfig = await getInstitutionDefaultConfig(institutionId);
		if (institutionConfig) {
			configs.set(ConfigurationSource.INSTITUTION_DEFAULT, institutionConfig);
		}
	}

	// User preference
	const userConfig = await getUserPreferredConfig(userId);
	if (userConfig) {
		configs.set(ConfigurationSource.USER_PREFERENCE, userConfig);
	}

	// Course default
	const courseConfig = await getCourseDefaultConfig(courseId);
	if (courseConfig) {
		configs.set(ConfigurationSource.COURSE_DEFAULT, courseConfig);
	}

	// Active week config
	const weekConfig = await getActiveWeekGenerationConfig(weekId);
	if (weekConfig) {
		configs.set(ConfigurationSource.COURSE_WEEK_OVERRIDE, weekConfig);
	}

	// Merge configurations by priority
	const mergedConfig = mergeConfigurationsByPriority(configs);

	// Apply adaptive algorithm
	return await generateAdaptiveConfig(userId, mergedConfig, weekId);
}

/**
 * Merge configurations based on priority system
 */
function mergeConfigurationsByPriority(
	configs: Map<ConfigurationSource, GenerationConfig>
): GenerationConfig {
	// Start with system default
	const mergedConfig = configs.get(ConfigurationSource.SYSTEM_DEFAULT) || getSystemDefaultConfig();

	// Apply each configuration in priority order (highest priority wins)
	const sortedConfigs = Array.from(configs.entries()).sort(
		([a], [b]) => CONFIG_PRIORITY[b] - CONFIG_PRIORITY[a]
	);

	for (const [source, config] of sortedConfigs) {
		if (source === ConfigurationSource.SYSTEM_DEFAULT) continue;

		// Merge non-undefined values from higher priority configs
		Object.assign(mergedConfig, config);
	}

	return mergedConfig;
}

/**
 * Save week generation configuration
 * Used to persist user-selected generation settings for a specific course week
 *
 * @param weekId - Course week ID
 * @param courseId - Course ID
 * @param userId - User who set the configuration
 * @param config - Generation configuration settings
 * @returns Promise<boolean> - Success status
 */
export async function saveCourseWeekGenerationConfig(
	weekId: string,
	courseId: string,
	userId: string,
	config: GenerationConfig
): Promise<boolean> {
	try {
		// Deactivate previous configs for this week
		await db
			.update(generationConfigs)
			.set({ isActive: false, updatedAt: sql`now()` })
			.where(
				and(
					eq(generationConfigs.weekId, weekId),
					eq(generationConfigs.configSource, ConfigurationSource.COURSE_WEEK_OVERRIDE)
				)
			);

		// Insert new course-week-level config
		await db.insert(generationConfigs).values({
			weekId,
			courseId,
			userId,
			configSource: ConfigurationSource.COURSE_WEEK_OVERRIDE,
			configData: config,
			createdBy: userId,
			isActive: true,
			metadata: {
				source: "user_interface",
				timestamp: new Date().toISOString(),
			},
		});

		return true;
	} catch (error) {
		console.error("Failed to save course week generation config:", error);
		return false;
	}
}

/**
 * Save user preference configuration
 * Used to persist user's default generation settings across all courses
 *
 * @param userId - User ID
 * @param config - Generation configuration settings
 * @returns Promise<boolean> - Success status
 */
export async function saveUserPreferenceConfig(
	userId: string,
	config: GenerationConfig
): Promise<boolean> {
	try {
		// Deactivate previous user preference configs
		await db
			.update(generationConfigs)
			.set({ isActive: false, updatedAt: sql`now()` })
			.where(
				and(
					eq(generationConfigs.userId, userId),
					eq(generationConfigs.configSource, ConfigurationSource.USER_PREFERENCE)
				)
			);

		// Insert new user preference config
		await db.insert(generationConfigs).values({
			userId,
			configSource: ConfigurationSource.USER_PREFERENCE,
			configData: config,
			createdBy: userId,
			isActive: true,
			metadata: {
				source: "user_preferences",
				timestamp: new Date().toISOString(),
			},
		});

		return true;
	} catch (error) {
		console.error("Failed to save user preference config:", error);
		return false;
	}
}

/**
 * Save course default configuration
 * Used to persist instructor's default generation settings for a course
 *
 * @param courseId - Course ID
 * @param instructorId - Instructor user ID
 * @param config - Generation configuration settings
 * @returns Promise<boolean> - Success status
 */
export async function saveCourseDefaultConfig(
	courseId: string,
	instructorId: string,
	config: GenerationConfig
): Promise<boolean> {
	try {
		// Deactivate previous course default configs
		await db
			.update(generationConfigs)
			.set({ isActive: false, updatedAt: sql`now()` })
			.where(
				and(
					eq(generationConfigs.courseId, courseId),
					eq(generationConfigs.configSource, ConfigurationSource.COURSE_DEFAULT),
					isNull(generationConfigs.weekId)
				)
			);

		// Insert new course default config
		await db.insert(generationConfigs).values({
			courseId,
			configSource: ConfigurationSource.COURSE_DEFAULT,
			configData: config,
			createdBy: instructorId,
			isActive: true,
			metadata: {
				source: "course_settings",
				instructor_id: instructorId,
				timestamp: new Date().toISOString(),
			},
		});

		return true;
	} catch (error) {
		console.error("Failed to save course default config:", error);
		return false;
	}
}

/**
 * Save adaptive algorithm configuration
 * Used to persist AI-generated adaptive configurations based on user performance
 *
 * @param userId - User ID
 * @param weekId - Course week ID (optional)
 * @param courseId - Course ID (optional)
 * @param config - Adaptive generation configuration
 * @returns Promise<boolean> - Success status
 */
export async function saveAdaptiveAlgorithmConfig(
	userId: string,
	config: AdaptiveGenerationConfig,
	weekId?: string,
	courseId?: string
): Promise<boolean> {
	try {
		// Insert adaptive algorithm config (we keep history, don't deactivate)
		await db.insert(generationConfigs).values({
			userId,
			weekId,
			courseId,
			configSource: ConfigurationSource.ADAPTIVE_ALGORITHM,
			configData: config,
			adaptationReason: config.adaptationReason,
			userPerformanceLevel: config.adaptiveFactors.userPerformanceLevel,
			learningGaps: config.adaptiveFactors.learningGaps,
			adaptiveFactors: config.adaptiveFactors,
			isActive: true,
			metadata: {
				source: "adaptive_algorithm",
				performance_score: config.adaptiveFactors.lastPerformanceScore,
				timestamp: new Date().toISOString(),
			},
		});

		return true;
	} catch (error) {
		console.error("Failed to save adaptive algorithm config:", error);
		return false;
	}
}

/**
 * Get institution default configuration
 * Future: For institutional scaling
 */
export async function getInstitutionDefaultConfig(
	institutionId: string
): Promise<GenerationConfig | null> {
	try {
		const config = await db
			.select({ configData: generationConfigs.configData })
			.from(generationConfigs)
			.where(
				and(
					eq(generationConfigs.institutionId, institutionId),
					eq(generationConfigs.configSource, ConfigurationSource.INSTITUTION_DEFAULT),
					eq(generationConfigs.isActive, true)
				)
			)
			.limit(1);

		if (config[0]?.configData) {
			return GenerationConfigSchema.parse(config[0].configData);
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Save institution default configuration
 * Future: For institutional scaling
 */
export async function saveInstitutionDefaultConfig(
	institutionId: string,
	adminUserId: string,
	config: GenerationConfig
): Promise<boolean> {
	try {
		// Deactivate previous institution default configs
		await db
			.update(generationConfigs)
			.set({ isActive: false, updatedAt: sql`now()` })
			.where(
				and(
					eq(generationConfigs.institutionId, institutionId),
					eq(generationConfigs.configSource, ConfigurationSource.INSTITUTION_DEFAULT)
				)
			);

		// Insert new institution default config
		await db.insert(generationConfigs).values({
			institutionId,
			configSource: ConfigurationSource.INSTITUTION_DEFAULT,
			configData: config,
			createdBy: adminUserId,
			isActive: true,
			metadata: {
				source: "institution_settings",
				admin_user_id: adminUserId,
				timestamp: new Date().toISOString(),
			},
		});

		return true;
	} catch (error) {
		console.error("Failed to save institution default config:", error);
		return false;
	}
}
