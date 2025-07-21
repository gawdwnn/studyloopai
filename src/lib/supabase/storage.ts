/**
 * Supabase Storage Utilities
 */

import { COURSE_MATERIALS_BUCKET } from "@/lib/config/storage";
import { getAdminClient, getServerClient } from "@/lib/supabase/server";

export interface StorageUploadOptions {
	/** Override existing file if it exists */
	upsert?: boolean;
	/** Cache control header */
	cacheControl?: string;
	/** Content type override */
	contentType?: string;
}

export interface StorageUploadResult {
	success: boolean;
	filePath?: string;
	error?: string;
}

export interface StorageDownloadResult {
	success: boolean;
	data?: Blob;
	buffer?: Buffer;
	error?: string;
}

export interface StorageRemoveResult {
	success: boolean;
	error?: string;
}

/**
 * Upload a file to Supabase storage
 */
export async function uploadFile(
	bucket: string,
	filePath: string,
	file: File | Buffer | ArrayBuffer,
	options: StorageUploadOptions = {}
): Promise<StorageUploadResult> {
	try {
		const supabase = await getServerClient();

		const { data, error } = await supabase.storage
			.from(bucket)
			.upload(filePath, file, {
				upsert: options.upsert ?? false,
				cacheControl: options.cacheControl ?? "3600",
				contentType: options.contentType,
			});

		if (error) {
			return {
				success: false,
				error: `Failed to upload to ${filePath}: ${error.message}`,
			};
		}

		return {
			success: true,
			filePath: data.path,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown upload error";
		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Upload a file using admin client (bypasses RLS)
 */
export async function uploadFileAdmin(
	bucket: string,
	filePath: string,
	file: File | Buffer | ArrayBuffer,
	options: StorageUploadOptions = {}
): Promise<StorageUploadResult> {
	try {
		const supabase = getAdminClient();

		const { data, error } = await supabase.storage
			.from(bucket)
			.upload(filePath, file, {
				upsert: options.upsert ?? false,
				cacheControl: options.cacheControl ?? "3600",
				contentType: options.contentType,
			});

		if (error) {
			return {
				success: false,
				error: `Failed to upload to ${filePath}: ${error.message}`,
			};
		}

		return {
			success: true,
			filePath: data.path,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown upload error";
		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Download a file from Supabase storage
 */
export async function downloadFile(
	bucket: string,
	filePath: string
): Promise<StorageDownloadResult> {
	try {
		const supabase = await getServerClient();

		const { data, error } = await supabase.storage
			.from(bucket)
			.download(filePath);

		if (error) {
			return {
				success: false,
				error: `Failed to download ${filePath}: ${error.message}`,
			};
		}

		if (!data) {
			return {
				success: false,
				error: `No data received for file: ${filePath}`,
			};
		}

		const buffer = Buffer.from(await data.arrayBuffer());

		return {
			success: true,
			data,
			buffer,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown download error";
		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Download a file using admin client (bypasses RLS)
 */
export async function downloadFileAdmin(
	bucket: string,
	filePath: string
): Promise<StorageDownloadResult> {
	try {
		const supabase = getAdminClient();

		const { data, error } = await supabase.storage
			.from(bucket)
			.download(filePath);

		if (error) {
			return {
				success: false,
				error: `Failed to download ${filePath}: ${error.message}`,
			};
		}

		if (!data) {
			return {
				success: false,
				error: `No data received for file: ${filePath}`,
			};
		}

		const buffer = Buffer.from(await data.arrayBuffer());

		return {
			success: true,
			data,
			buffer,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown download error";
		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Remove a file from Supabase storage
 */
export async function removeFile(
	bucket: string,
	filePath: string
): Promise<StorageRemoveResult> {
	try {
		const supabase = await getServerClient();

		const { error } = await supabase.storage.from(bucket).remove([filePath]);

		if (error) {
			return {
				success: false,
				error: `Failed to remove ${filePath}: ${error.message}`,
			};
		}

		return {
			success: true,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown removal error";
		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Remove a file using admin client (bypasses RLS)
 */
export async function removeFileAdmin(
	bucket: string,
	filePath: string
): Promise<StorageRemoveResult> {
	try {
		const supabase = getAdminClient();

		const { error } = await supabase.storage.from(bucket).remove([filePath]);

		if (error) {
			return {
				success: false,
				error: `Failed to remove ${filePath}: ${error.message}`,
			};
		}

		return {
			success: true,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown removal error";
		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Remove multiple files from Supabase storage
 */
export async function removeFiles(
	bucket: string,
	filePaths: string[]
): Promise<StorageRemoveResult> {
	try {
		const supabase = await getServerClient();

		const { error } = await supabase.storage.from(bucket).remove(filePaths);

		if (error) {
			return {
				success: false,
				error: `Failed to remove files: ${error.message}`,
			};
		}

		return {
			success: true,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown removal error";
		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Remove multiple files using admin client (bypasses RLS)
 */
export async function removeFilesAdmin(
	bucket: string,
	filePaths: string[]
): Promise<StorageRemoveResult> {
	try {
		const supabase = getAdminClient();

		const { error } = await supabase.storage.from(bucket).remove(filePaths);

		if (error) {
			return {
				success: false,
				error: `Failed to remove files: ${error.message}`,
			};
		}

		return {
			success: true,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown removal error";
		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Get the public URL for a file (for publicly accessible files)
 */
export function getPublicUrl(bucket: string, filePath: string): string {
	const supabase = getAdminClient(); // No async needed for getPublicUrl
	const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

	return data.publicUrl;
}

/**
 * Generate a signed URL for private file access
 */
export async function getSignedUrl(
	bucket: string,
	filePath: string,
	expiresIn = 3600 // 1 hour by default
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
	try {
		const supabase = await getServerClient();

		const { data, error } = await supabase.storage
			.from(bucket)
			.createSignedUrl(filePath, expiresIn);

		if (error) {
			return {
				success: false,
				error: `Failed to create signed URL for ${filePath}: ${error.message}`,
			};
		}

		return {
			success: true,
			signedUrl: data.signedUrl,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown signed URL error";
		return {
			success: false,
			error: errorMessage,
		};
	}
}

// Course materials specific helpers

/**
 * Upload a course material file
 */
export async function uploadCourseMaterial(
	userId: string,
	materialId: string,
	fileName: string,
	file: File,
	options?: StorageUploadOptions
): Promise<StorageUploadResult> {
	const filePath = `${userId}/${materialId}/${fileName}`;
	return uploadFile(COURSE_MATERIALS_BUCKET, filePath, file, options);
}

/**
 * Download a course material file (admin access for background processing)
 */
export async function downloadCourseMaterial(
	filePath: string
): Promise<StorageDownloadResult> {
	return downloadFileAdmin(COURSE_MATERIALS_BUCKET, filePath);
}

/**
 * Remove a course material file
 */
export async function removeCourseMaterial(
	filePath: string
): Promise<StorageRemoveResult> {
	return removeFileAdmin(COURSE_MATERIALS_BUCKET, filePath);
}

/**
 * Remove multiple course material files
 */
export async function removeCourseMaterials(
	filePaths: string[]
): Promise<StorageRemoveResult> {
	return removeFilesAdmin(COURSE_MATERIALS_BUCKET, filePaths);
}

/**
 * Create a signed upload URL for a file
 */
export async function createSignedUploadUrl(
	bucket: string,
	filePath: string
): Promise<{
	success: boolean;
	signedUrl?: string;
	token?: string;
	error?: string;
}> {
	try {
		const supabase = getAdminClient();
		const { data, error } = await supabase.storage
			.from(bucket)
			.createSignedUploadUrl(filePath);

		if (error) {
			return { success: false, error: error.message };
		}

		// `createSignedUploadUrl` response contains `signedUrl` and `token`.
		const token = (data as { token?: string }).token;
		return { success: true, signedUrl: data.signedUrl, token };
	} catch (err) {
		return {
			success: false,
			error:
				err instanceof Error
					? err.message
					: "Unknown error while creating signed URL",
		};
	}
}

// wrapper for course materials bucket
export async function createSignedUploadUrlForCourseMaterial(filePath: string) {
	return createSignedUploadUrl(COURSE_MATERIALS_BUCKET, filePath);
}
