import type { GenerationConfig } from "@/components/course/course-material-upload-wizard";

/** Payload returned by the /api/materials/presign endpoint */
export interface PresignUploadResponse {
	signedUrl: string;
	token: string;
	materialId: string;
	filePath: string;
}

/** Fetches a signed upload URL for a new course material */
export async function presignUpload(body: Record<string, unknown>): Promise<PresignUploadResponse> {
	const res = await fetch("/api/materials/presign", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		throw new Error(await res.text());
	}

	return res.json() as Promise<PresignUploadResponse>;
}

/** Signals the backend that all uploads are complete */
export interface CompleteUploadResponse {
	runId: string;
	publicAccessToken: string;
}

export async function completeUpload(
	materialIds: string[],
	weekId: string,
	courseId: string,
	generationConfig?: GenerationConfig
): Promise<CompleteUploadResponse> {
	const res = await fetch("/api/materials/complete", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ materialIds, weekId, courseId, generationConfig }),
	});

	if (!res.ok) {
		throw new Error(await res.text());
	}

	return res.json() as Promise<CompleteUploadResponse>;
}
