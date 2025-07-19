import type {
	FeatureType,
	SelectiveGenerationConfig,
} from "@/types/generation-types";
import { z } from "zod";

// Selective generation config schema - the only config type we support
export const SelectiveGenerationConfigSchema = z.object({
	selectedFeatures: z.object({
		cuecards: z.boolean(),
		mcqs: z.boolean(),
		openQuestions: z.boolean(),
		summaries: z.boolean(),
		goldenNotes: z.boolean(),
		conceptMaps: z.boolean(),
	}),
	featureConfigs: z.object({
		cuecards: z
			.object({
				count: z.number().min(5).max(100),
				difficulty: z.enum(["beginner", "intermediate", "advanced"]),
				focus: z.enum(["conceptual", "practical", "mixed"]),
				mode: z.enum(["definition", "application", "comprehensive"]),
			})
			.optional(),
		mcqs: z
			.object({
				count: z.number().min(5).max(50),
				difficulty: z.enum(["beginner", "intermediate", "advanced"]),
				focus: z.enum(["conceptual", "practical", "mixed"]),
			})
			.optional(),
		openQuestions: z
			.object({
				count: z.number().min(1).max(25),
				difficulty: z.enum(["beginner", "intermediate", "advanced"]),
				focus: z.enum(["conceptual", "practical", "mixed"]),
			})
			.optional(),
		summaries: z
			.object({
				count: z.number().min(1).max(5),
				difficulty: z.enum(["beginner", "intermediate", "advanced"]),
				focus: z.enum(["conceptual", "practical", "mixed"]),
				length: z.enum(["short", "medium", "long"]),
			})
			.optional(),
		goldenNotes: z
			.object({
				count: z.number().min(1).max(20),
				difficulty: z.enum(["beginner", "intermediate", "advanced"]),
				focus: z.enum(["conceptual", "practical", "mixed"]),
			})
			.optional(),
		conceptMaps: z
			.object({
				difficulty: z.enum(["beginner", "intermediate", "advanced"]),
				focus: z.enum(["conceptual", "practical", "mixed"]),
				style: z.enum(["hierarchical", "radial", "network"]),
			})
			.optional(),
	}),
});

// Validation rules for generation configs
export const VALIDATION_RULES = {
	cuecards: {
		count: { min: 5, max: 100 },
		defaultCount: 10,
	},
	mcqs: {
		count: { min: 5, max: 50 },
		defaultCount: 10,
	},
	openQuestions: {
		count: { min: 1, max: 25 },
		defaultCount: 5,
	},
	summaries: {
		count: { min: 1, max: 5 },
		defaultCount: 1,
	},
	goldenNotes: {
		count: { min: 1, max: 20 },
		defaultCount: 5,
	},
	conceptMaps: {
		// Concept maps don't have count - always generate exactly 1
	},
} as const;

// Validation errors
export interface ValidationError {
	field: string;
	message: string;
	code: string;
}

// Validate selective generation config
export function validateSelectiveGenerationConfig(
	config: SelectiveGenerationConfig
): ValidationError[] {
	const errors: ValidationError[] = [];

	// Check if at least one feature is selected
	const selectedFeatures = Object.values(config.selectedFeatures).some(Boolean);
	if (!selectedFeatures) {
		errors.push({
			field: "selectedFeatures",
			message: "At least one feature must be selected for generation",
			code: "NO_FEATURES_SELECTED",
		});
	}

	// Validate each selected feature's configuration
	for (const [feature, isSelected] of Object.entries(config.selectedFeatures)) {
		if (isSelected) {
			const featureType = feature as FeatureType;
			const featureConfig = config.featureConfigs[featureType];

			if (!featureConfig) {
				errors.push({
					field: `featureConfigs.${feature}`,
					message: `Configuration required for selected feature: ${feature}`,
					code: "MISSING_FEATURE_CONFIG",
				});
				continue;
			}

			// Validate feature-specific rules
			const rules = VALIDATION_RULES[featureType];
			if (rules) {
				if ("count" in featureConfig && "count" in rules) {
					const count = featureConfig.count as number;
					if (count < rules.count.min || count > rules.count.max) {
						errors.push({
							field: `featureConfigs.${feature}.count`,
							message: `${feature} count must be between ${rules.count.min} and ${rules.count.max}`,
							code: "INVALID_COUNT_RANGE",
						});
					}
				}
			}
		}
	}

	return errors;
}

// Check if config is valid
export function isValidSelectiveConfig(
	config: SelectiveGenerationConfig
): boolean {
	return validateSelectiveGenerationConfig(config).length === 0;
}
