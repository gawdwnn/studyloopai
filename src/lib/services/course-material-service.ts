import { fetchWithErrorHandling } from "@/lib/utils/api-error-handler";
import type { SelectiveGenerationConfig } from "@/types/generation-types";

/** Payload returned by the /api/materials/presign endpoint */
export interface PresignUploadResponse {
	signedUrl: string;
	token: string;
	materialId: string;
	filePath: string;
}

/** Fetches a signed upload URL for a new course material */
export async function presignUpload(
	body: Record<string, unknown>
): Promise<PresignUploadResponse> {
	const res = await fetchWithErrorHandling("/api/materials/presign", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		// Error toast already shown by fetchWithErrorHandling
		throw new Error("Upload preparation failed");
	}

	return res.json() as Promise<PresignUploadResponse>;
}

/** Signals the backend that all uploads are complete */
export interface CompleteUploadResponse {
	runId: string;
	publicAccessToken: string;
	weekId: string;
	courseId: string;
}

export async function completeUpload(
	materialIds: string[],
	weekId: string,
	courseId: string,
	selectiveConfig: SelectiveGenerationConfig
): Promise<CompleteUploadResponse> {
	const res = await fetchWithErrorHandling("/api/materials/complete", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({
			materialIds,
			weekId,
			courseId,
			selectiveConfig,
		}),
	});

	if (!res.ok) {
		// Error toast already shown by fetchWithErrorHandling
		throw new Error("Upload completion failed");
	}

	return res.json() as Promise<CompleteUploadResponse>;
}
