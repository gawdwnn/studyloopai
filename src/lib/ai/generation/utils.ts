import { db } from "@/db";
import { documentChunks } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { z } from "zod";

/**
 * Get document chunks for a material
 */
export async function getMaterialChunks(materialId: string): Promise<string[]> {
	const chunks = await db
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
 * Parse JSON response with Zod validation for arrays
 */
export function parseJsonArrayResponse<T>(
	response: string,
	schema: z.ZodArray<z.ZodTypeAny>,
	fallback: T[]
): T[] {
	try {
		const parsed = JSON.parse(response);
		const result = schema.safeParse(parsed);

		if (result.success) {
			return result.data;
		}
		console.warn("Array validation failed:", result.error.errors);
		return fallback;
	} catch (error) {
		console.warn("Failed to parse JSON array response:", error);
		return fallback;
	}
}

/**
 * Parse JSON response with Zod validation for single objects
 */
export function parseJsonObjectResponse<T>(
	response: string,
	schema: z.ZodObject<z.ZodRawShape>,
	fallback: T
): T {
	try {
		const parsed = JSON.parse(response);
		const result = schema.safeParse(parsed);

		if (result.success) {
			return result.data as T;
		}
		console.warn("Object validation failed:", result.error.errors);
		return fallback;
	} catch (error) {
		console.warn("Failed to parse JSON object response:", error);
		return fallback;
	}
}

/**
 * Aggregate chunks from multiple materials
 */
export async function getCombinedChunks(
	materialIds: string[]
): Promise<string[]> {
	const allChunks: string[] = [];
	for (const id of materialIds) {
		const materialChunks = await getMaterialChunks(id);
		allChunks.push(...materialChunks);
	}
	return allChunks;
}
