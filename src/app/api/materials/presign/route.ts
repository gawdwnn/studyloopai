"use server";

import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import {
	FILE_UPLOAD_LIMITS,
	getContentTypeFromFilename,
	getContentTypeFromMime,
} from "@/lib/constants/file-upload";
import { getServerClient } from "@/lib/supabase/server";
import { createSignedUploadUrlForCourseMaterial } from "@/lib/supabase/storage";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Server-side validation schema
const GenerationConfigSchema = z.object({
	goldenNotesCount: z.number().min(1).max(20),
	flashcardsCount: z.number().min(1).max(50),
	summaryLength: z.number().min(50).max(1000),
	examExercisesCount: z.number().min(1).max(20),
	mcqExercisesCount: z.number().min(1).max(50),
	difficulty: z.enum(["beginner", "intermediate", "advanced"]),
	focus: z.enum(["conceptual", "practical", "mixed"]),
});

const BodySchema = z.object({
	courseId: z.string().uuid("Invalid course ID"),
	weekId: z.string().uuid("Invalid week ID").optional(),
	fileName: z
		.string()
		.min(1, "File name is required")
		.max(255, "File name too long")
		.refine((name) => name.toLowerCase().endsWith(".pdf"), "Only PDF files are supported"),
	mimeType: z.string().refine((mime) => mime === "application/pdf", "Only PDF files are supported"),
	fileSize: z
		.number()
		.min(1, "File cannot be empty")
		.max(
			FILE_UPLOAD_LIMITS.MAX_FILE_SIZE,
			`File size exceeds ${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB limit`
		),
	contentType: z.string().optional(),
	generationConfig: GenerationConfigSchema.optional(),
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
		const { success, signedUrl, token, error } =
			await createSignedUploadUrlForCourseMaterial(filePath);

		if (!success || !signedUrl) {
			return NextResponse.json({ error: error || "Failed to create signed URL" }, { status: 500 });
		}

		return NextResponse.json({
			signedUrl,
			token,
			materialId: material.id,
			filePath,
		});
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 400 }
		);
	}
}
