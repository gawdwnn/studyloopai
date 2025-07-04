import { removeCourseMaterials } from "@/lib/supabase/storage";

export interface StorageCleanupResult {
	filesDeleted: number;
	storageErrors: string[];
	hasErrors: boolean;
}

/**
 * Clean up storage files with comprehensive error handling
 */
export async function cleanupStorageFiles(filePaths: string[]): Promise<StorageCleanupResult> {
	const storageErrors: string[] = [];
	let filesDeleted = 0;

	if (filePaths.length === 0) {
		return {
			filesDeleted: 0,
			storageErrors: [],
			hasErrors: false,
		};
	}

	try {
		const storageResult = await removeCourseMaterials(filePaths);

		if (storageResult.success) {
			filesDeleted = filePaths.length;
		} else {
			storageErrors.push(storageResult.error || "Unknown storage error");
			console.error("Failed to delete files from storage:", storageResult.error);
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : "Unknown error";
		storageErrors.push(errorMsg);
		console.error("Exception deleting files from storage:", error);
	}

	return {
		filesDeleted,
		storageErrors,
		hasErrors: storageErrors.length > 0,
	};
}

/**
 * Extract file paths from course materials data
 */
export function extractFilePaths(
	materials: Array<{ filePath: string | null }>,
	additionalPaths: (string | null)[] = []
): string[] {
	const allFilePaths: string[] = [];

	// Add material file paths
	for (const material of materials) {
		if (material.filePath) {
			allFilePaths.push(material.filePath);
		}
	}

	// Add additional paths
	for (const path of additionalPaths) {
		if (path && !allFilePaths.includes(path)) {
			allFilePaths.push(path);
		}
	}

	return allFilePaths;
}
