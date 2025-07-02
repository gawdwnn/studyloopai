/**
 * Response payload returned from the /api/materials/presign endpoint.
 */
export interface PresignUploadResponse {
	signedUrl: string;
	materialId: string;
	filePath: string;
}

/**
 * Request a signed upload URL for a new course material.
 *
 * @param body - JSON body that will be forwarded to the API route. Should contain
 *               courseId, weekId, fileName, mimeType and generationConfig.
 * @throws Will throw if the network request fails or the API responds with a non-2xx status.
 */
export async function presignUpload(body: Record<string, unknown>): Promise<PresignUploadResponse> {
	const res = await fetch("/api/materials/presign", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		throw new Error(await res.text());
	}

	return res.json() as Promise<PresignUploadResponse>;
}

/**
 * Notify the backend that all files have been uploaded so that post-processing can start.
 *
 * @param materialIds - Array of material IDs that were successfully uploaded.
 * @throws Will throw if the network request fails or the API responds with a non-2xx status.
 */
export async function completeUpload(materialIds: string[]): Promise<void> {
	const res = await fetch("/api/materials/complete", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ materialIds }),
	});

	if (!res.ok) {
		throw new Error(await res.text());
	}
}
