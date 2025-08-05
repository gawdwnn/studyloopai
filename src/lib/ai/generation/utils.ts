import type { DatabaseClient } from "@/db";
import { documentChunks } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get document chunks for a material
 */
export async function getMaterialChunks(
	materialId: string,
	database: DatabaseClient
): Promise<string[]> {
	const chunks = await database
		.select({ content: documentChunks.content })
		.from(documentChunks)
		.where(eq(documentChunks.materialId, materialId))
		.orderBy(documentChunks.chunkIndex);

	return chunks.map((chunk) => chunk.content);
}

/**
 * Combine chunks into content for generation
 */
export function combineChunksForGeneration(
	chunks: string[],
	maxLength = 15000
): string {
	// Combine chunks up to maxLength to avoid token limits
	let combinedContent = "";
	let currentLength = 0;

	for (const chunk of chunks) {
		if (currentLength + chunk.length > maxLength) {
			break;
		}
		combinedContent += `${chunk}\n\n`;
		currentLength += chunk.length;
	}

	return combinedContent.trim();
}

/**
 * Aggregate chunks from multiple materials
 */
export async function getCombinedChunks(
	materialIds: string[],
	database: DatabaseClient
): Promise<string[]> {
	const allChunks: string[] = [];
	for (const id of materialIds) {
		const materialChunks = await getMaterialChunks(id, database);
		allChunks.push(...materialChunks);
	}
	return allChunks;
}
