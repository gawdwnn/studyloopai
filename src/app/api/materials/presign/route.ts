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
import { getUserFriendlyErrorMessage } from "@/lib/utils/error-messages";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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
			return NextResponse.json({ error: "Session expired. Please refresh the page and try again." }, { status: 401 });
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

		// Create signed upload URL (15-min TTL)
		const { success, signedUrl, token, error } =
			await createSignedUploadUrlForCourseMaterial(filePath);

		if (!success || !signedUrl) {
			console.error("Failed to create signed URL:", error);
			return NextResponse.json({ error: "Service temporarily unavailable. Please try again in a few moments." }, { status: 500 });
		}

		return NextResponse.json({
			signedUrl,
			token,
			materialId: material.id,
			filePath,
		});
	} catch (err) {
		console.error("Materials presign error:", err);
		
		const userMessage = getUserFriendlyErrorMessage(
			err instanceof Error ? err : "Unknown error occurred"
		);
		
		return NextResponse.json(
			{ error: userMessage },
			{ status: 400 }
		);
	}
}
