"use server";

import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import { getContentTypeFromFilename, getContentTypeFromMime } from "@/lib/constants/file-upload";
import { getServerClient } from "@/lib/supabase/server";
import { createSignedUploadUrlForCourseMaterial } from "@/lib/supabase/storage";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
	courseId: z.string(),
	weekId: z.string().optional(),
	fileName: z.string(),
	mimeType: z.string(),
	contentType: z.string().optional(),
	generationConfig: z.any().optional(),
});

export async function POST(req: NextRequest) {
	try {
		const json = await req.json();
		const body = BodySchema.parse(json);

		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
		}

		// Determine content type
		const detectedContentType =
			body.contentType ||
			getContentTypeFromMime(body.mimeType) ||
			getContentTypeFromFilename(body.fileName);

		// Insert placeholder row
		const [material] = await db
			.insert(courseMaterials)
			.values({
				courseId: body.courseId,
				weekId: body.weekId,
				title: body.fileName,
				fileName: body.fileName,
				originalFilename: body.fileName,
				mimeType: body.mimeType,
				contentType: detectedContentType,
				uploadStatus: "pending",
				processingMetadata: { processingStatus: "pending" },
				uploadedBy: user.id,
			})
			.returning();

		const filePath = `${user.id}/${material.id}/${body.fileName}`;

		// Update row with filePath
		await db.update(courseMaterials).set({ filePath }).where(eq(courseMaterials.id, material.id));

		// Save generation config if provided
		if (body.generationConfig) {
			const { saveMaterialGenerationConfig } = await import(
				"@/lib/services/generation-config-service"
			);
			await saveMaterialGenerationConfig(material.id, user.id, body.generationConfig);
		}

		// Create signed upload URL (15-min TTL)
		const { success, signedUrl, error } = await createSignedUploadUrlForCourseMaterial(filePath);

		if (!success || !signedUrl) {
			return NextResponse.json({ error: error || "Failed to create signed URL" }, { status: 500 });
		}

		return NextResponse.json({ signedUrl, materialId: material.id, filePath });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 400 }
		);
	}
}
