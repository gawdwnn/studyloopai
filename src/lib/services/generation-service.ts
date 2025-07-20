import type { FeatureType, SelectiveGenerationConfig } from "@/types/generation-types";

/** Request payload for triggering on-demand generation */
export interface TriggerGenerationRequest {
	courseId: string;
	weekId: string;
	contentTypes: FeatureType[];
	config?: SelectiveGenerationConfig;
}

/** Response from generation trigger API */
export interface TriggerGenerationResponse {
	success: true;
	runId: string;
	publicAccessToken: string;
	configId: string;
	contentTypes: FeatureType[];
	materialCount: number;
}

/** Triggers on-demand generation for specific content types */
export async function triggerGeneration(
	request: TriggerGenerationRequest
): Promise<TriggerGenerationResponse> {
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

	return res.json() as Promise<TriggerGenerationResponse>;
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
	contentAvailability: Record<FeatureType, {
		status: "available" | "none" | "error";
		count: number;
		isGenerating: boolean;
		error?: string;
	}>;
	overallStatus: "available" | "none" | "error";
	isGenerating: boolean;
	lastUpdated: Date;
}

/** Checks current generation status and content availability */
export async function getGenerationStatus(
	request: GenerationStatusRequest
): Promise<GenerationStatusResponse> {
	const params = new URLSearchParams({
		courseId: request.courseId,
		weekId: request.weekId,
	});

	const res = await fetch(`/api/generation/status?${params}`, {
		method: "GET",
		credentials: "include",
	});

	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(errorText || `Status check failed: ${res.status}`);
	}

	const data = await res.json();
	
	// Parse the lastUpdated string to Date object
	return {
		...data,
		lastUpdated: new Date(data.lastUpdated),
	} as GenerationStatusResponse;
}