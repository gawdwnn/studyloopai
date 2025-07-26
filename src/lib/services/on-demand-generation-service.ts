import type { configurationSource } from "@/db/schema";
import type {
	FeatureType,
	SelectiveGenerationConfig,
} from "@/types/generation-types";

/** Request payload for triggering on-demand generation */
export interface TriggerOnDemandGenerationRequest {
	courseId: string;
	weekId: string;
	featureTypes: FeatureType[];
	config: SelectiveGenerationConfig;
	configSource: (typeof configurationSource.enumValues)[number];
}

/** Response from generation trigger API */
export interface TriggerOnDemandGenerationResponse {
	success: true;
	runId: string;
	publicAccessToken: string;
}

/** Triggers on-demand generation for specific content types */
export async function triggerOnDemandGeneration(
	request: TriggerOnDemandGenerationRequest
): Promise<TriggerOnDemandGenerationResponse> {
	const res = await fetch("/api/generation/trigger", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(request),
	});

	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(errorText || `Generation trigger failed: ${res.status}`);
	}

	return res.json() as Promise<TriggerOnDemandGenerationResponse>;
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
