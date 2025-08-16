import { createLogger } from "@/lib/utils/logger";
import type {
	FeatureType,
	SelectiveGenerationConfig,
} from "@/types/generation-types";

const logger = createLogger("on-demand-generation");

/** Request payload for triggering on-demand generation */
export interface TriggerOnDemandGenerationRequest {
	courseId: string;
	weekId: string;
	featureTypes: FeatureType[];
	config: SelectiveGenerationConfig;
}

/** Response from generation trigger API */
export interface TriggerOnDemandGenerationResponse {
	success: true;
	runId: string;
	publicAccessToken: string;
}

/** Generation result interface for consistent return types */
export interface GenerationResult {
	success: boolean;
	runId?: string;
	publicAccessToken?: string;
	error?: string;
}

/** Parameters for generation trigger with feature type */
export interface GenerationTriggerParams {
	courseId: string;
	weekIds: string[];
	generationConfig: SelectiveGenerationConfig;
	featureType: FeatureType;
}

/** Generation state for shared hook */
export interface GenerationState {
	isLoading: boolean;
	status: string;
	error: string | null;
	generationRunId?: string;
	generationToken?: string;
}

/**
 * Triggers on-demand content generation for specific feature types.
 */
export async function triggerOnDemandGeneration(
	params: GenerationTriggerParams
): Promise<GenerationResult> {
	try {
		const res = await fetch("/api/generation/trigger", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({
				courseId: params.courseId,
				weekId: params.weekIds[0],
				featureTypes: [params.featureType],
				config: params.generationConfig,
			} satisfies TriggerOnDemandGenerationRequest),
		});

		if (!res.ok) {
			const errorText = await res.text();
			throw new Error(errorText || `Generation trigger failed: ${res.status}`);
		}

		const result = (await res.json()) as TriggerOnDemandGenerationResponse;

		logger.debug(
			{
				courseId: params.courseId,
				weekId: params.weekIds[0],
				featureType: params.featureType,
				runId: result.runId,
			},
			`Successfully triggered ${params.featureType} generation`
		);

		return {
			success: true,
			runId: result.runId,
			publicAccessToken: result.publicAccessToken,
		};
	} catch (error) {
		logger.error(
			{
				error,
				courseId: params.courseId,
				weekId: params.weekIds[0],
				featureType: params.featureType,
			},
			`Failed to trigger ${params.featureType} generation`
		);

		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/** Request payload for checking generation status */
export interface GenerationStatusRequest {
	courseId: string;
	weekId: string;
}

/** Response from generation status API */
export interface GenerationStatusResponse {
	success: true;
	courseId: string;
	weekId: string;
	contentAvailability: Record<
		FeatureType,
		{
			status: "available" | "none" | "error";
			count: number;
			isGenerating: boolean;
			error?: string;
		}
	>;
	overallStatus: "available" | "none" | "error";
	isGenerating: boolean;
	lastUpdated: Date;
}
