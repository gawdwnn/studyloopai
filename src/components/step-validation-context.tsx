"use client";

import { createContext, useContext } from "react";

// Step configuration defining skip behavior
export interface StepConfig {
	canSkip: boolean;
	required: string[];
	title: string;
}

// Context for step validation
export interface StepValidationContextType {
	setStepValid: (isValid: boolean) => void;
	getStepData: () => Record<string, unknown> | null;
	setStepData: (data: Record<string, unknown>) => void;
	// Enhanced skip functionality - with backward compatibility
	canSkipStep?: boolean;
	skipCurrentStep?: () => void;
	skipAllOnboarding?: () => void;
}

export const StepValidationContext =
	createContext<StepValidationContextType | null>(null);

export const useStepValidation = () => {
	const context = useContext(StepValidationContext);
	if (!context) {
		throw new Error(
			"useStepValidation must be used within StepValidationProvider"
		);
	}
	return context;
};

// Step configuration - defines which steps can be skipped
export const STEP_CONFIGS: Record<number, StepConfig> = {
	1: {
		canSkip: true,
		required: ["firstName", "lastName"],
		title: "Profile Setup",
	},
	2: {
		canSkip: true,
		required: [],
		title: "Study Goals",
	},
	3: {
		canSkip: false, // Billing step cannot be skipped individually
		required: ["selectedPlan"],
		title: "Plan Selection",
	},
	4: {
		canSkip: false, // Completion step
		required: [],
		title: "Completion",
	},
};
