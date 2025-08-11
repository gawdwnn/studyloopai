import { db } from "@/db";
import { courseMaterials, courseWeeks, courses } from "@/db/schema";
import { checkQuotaAndConsume } from "@/lib/actions/plans";
import {
	DOCUMENT_PROCESSING_CONFIG,
	detectDocumentType,
	getAllSupportedExtensions,
	getAllSupportedMimeTypes,
} from "@/lib/config/document-processing";
import { checkAPIStrictRateLimit } from "@/lib/rate-limit";
import { getServerClient } from "@/lib/supabase/server";
import { createSignedUploadUrlForCourseMaterial } from "@/lib/supabase/storage";
import {
	API_ERROR_CODES,
	createQuotaErrorResponse,
} from "@/lib/types/api-errors";
import { logger } from "@/lib/utils/logger";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Centralized supported types from config
const allSupportedMimeTypes = getAllSupportedMimeTypes();
const allSupportedExtensions = getAllSupportedExtensions();

const BodySchema = z.object({
	courseId: z.string().uuid("Invalid course ID"),
	weekId: z.string().uuid("Invalid week ID"),
	fileName: z
		.string()
		.min(1, "File name is required")
		.max(255, "File name too long")
		.refine(
			(name) => {
				const ext = name.toLowerCase().split(".").pop();
				if (!ext) return false;
				const extensionWithDot = `.${ext}` as const;
				return allSupportedExtensions.includes(extensionWithDot);
			},
			`Supported file types: ${allSupportedExtensions.join(", ")}`
		),
	mimeType: z
		.string()
		.refine(
			(mime) => allSupportedMimeTypes.includes(mime),
			`Supported MIME types: ${allSupportedMimeTypes.join(", ")}`
		),
  fileSize: z
    .number()
    .min(1, "File cannot be empty")
    .max(
      DOCUMENT_PROCESSING_CONFIG.UPLOAD.maxFileSizeBytes,
      `File too large. Max ${(DOCUMENT_PROCESSING_CONFIG.UPLOAD.maxFileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
    ),
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
			return NextResponse.json(
				{ error: "Session expired. Please refresh the page and try again." },
				{ status: 401 }
			);
		}

		// Strategic rate limiting to prevent upload abuse (not for quota enforcement)
		const rateLimitResult = await checkAPIStrictRateLimit(user.id);
		if (!rateLimitResult.success) {
			const resetMinutes = rateLimitResult.reset
				? Math.ceil((rateLimitResult.reset - Date.now()) / 60000)
				: 60;

			return NextResponse.json(
				{
					error: "Too many upload requests",
					code: API_ERROR_CODES.RATE_LIMIT_EXCEEDED,
					details: {
						limit: 30,
						remaining: rateLimitResult.remaining,
						resetTime: rateLimitResult.reset,
						retryAfterSeconds: Math.ceil(
							((rateLimitResult.reset || Date.now()) - Date.now()) / 1000
						),
					},
				},
				{
					status: 429,
					headers: {
						"X-RateLimit-Limit": "30",
						"X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
						"X-RateLimit-Reset": rateLimitResult.reset?.toString() || "",
						"Retry-After": Math.ceil(
							((rateLimitResult.reset || Date.now()) - Date.now()) / 1000
						).toString(),
					},
				}
			);
		}

		// STEP 1A: Validate the user owns the specified course week (courseId + weekId association)
		const weekOwnership = await db
			.select({ id: courseWeeks.id })
			.from(courseWeeks)
			.innerJoin(courses, eq(courses.id, courseWeeks.courseId))
			.where(
				and(
					eq(courseWeeks.id, body.weekId),
					eq(courseWeeks.courseId, body.courseId),
					eq(courses.userId, user.id)
				)
			);

		if (weekOwnership.length === 0) {
			return NextResponse.json(
				{
					error: "You do not have access to this course week",
					code: "WEEK_ACCESS_DENIED",
				},
				{ status: 403 }
			);
		}

		// STEP 1B: VALIDATE FILE USING EXISTING DOCUMENT PROCESSING CONFIG
		// Check if the file type and mime type are supported (no size limits)
		if (!allSupportedMimeTypes.includes(body.mimeType)) {
			return NextResponse.json(
				{ error: `Unsupported file type: ${body.mimeType}` },
				{ status: 400 }
			);
		}

		if (body.fileSize === 0) {
			return NextResponse.json(
				{ error: "File cannot be empty" },
				{ status: 400 }
			);
		}

		// Determine content type using consolidated detector
		let detectedContentType: string;
		try {
			detectedContentType = detectDocumentType({
				mimeType: body.mimeType,
				fileName: body.fileName,
			});
		} catch (e) {
			return NextResponse.json(
				{
					error:
						e instanceof Error
							? e.message
							: `Unsupported file type. Supported types: ${allSupportedExtensions.join(", ")}`,
				},
				{ status: 400 }
			);
		}

		// STEP 2: CHECK MATERIALS QUOTA ONLY
		const materialsCheck = await checkQuotaAndConsume(
			user.id,
			"materials_uploaded",
			1
		);
		if (!materialsCheck.allowed && materialsCheck.quotaDetails) {
			const quotaError = createQuotaErrorResponse(
				materialsCheck.quotaDetails.quotaType,
				materialsCheck.quotaDetails.currentUsage,
				materialsCheck.quotaDetails.quotaLimit,
				materialsCheck.quotaDetails.planId
			);
			// Attach remaining usage to response headers as a convenience
			const res = NextResponse.json(quotaError, { status: 429 });
			const remaining = Math.max(
				0,
				quotaError.details.quotaLimit - quotaError.details.currentUsage
			);
			res.headers.set("X-Quota-Remaining", remaining.toString());
			res.headers.set(
				"X-Quota-Limit",
				quotaError.details.quotaLimit.toString()
			);
			return res;
		}

		// STEP 3: PROCEED WITH FILE PREPARATION (quotas already consumed)
		// Insert placeholder row and set filePath atomically
		const { material, filePath } = await db.transaction(async (tx) => {
			const [inserted] = await tx
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
					uploadedBy: user.id,
				})
				.returning();

			if (!inserted) {
				throw new Error("ERR_MATERIAL_INSERT_FAILED");
			}

			const computedFilePath = `${user.id}/${inserted.id}/${body.fileName}`;

			const [updated] = await tx
				.update(courseMaterials)
				.set({ filePath: computedFilePath })
				.where(eq(courseMaterials.id, inserted.id))
				.returning({ id: courseMaterials.id });

			if (!updated) {
				throw new Error("ERR_MATERIAL_UPDATE_FAILED");
			}

			return { material: inserted, filePath: computedFilePath };
		});

		// Create signed upload URL (15-min TTL)
		const { success, signedUrl, token, error } =
			await createSignedUploadUrlForCourseMaterial(filePath);

		if (!success || !signedUrl) {
			logger.error("Failed to create signed URL for material upload", {
				message: error || "Unknown error",
				materialId: material.id,
				filePath,
				userId: user.id,
				route: "/api/materials/presign",
			});

			// Mark the material as failed since signed URL creation failed
			try {
				await db
					.update(courseMaterials)
					.set({ uploadStatus: "failed" })
					.where(eq(courseMaterials.id, material.id));
			} catch (updateErr) {
				logger.error("Failed to update material status to failed", {
					message:
						updateErr instanceof Error ? updateErr.message : String(updateErr),
					stack: updateErr instanceof Error ? updateErr.stack : undefined,
					materialId: material.id,
					userId: user.id,
					route: "/api/materials/presign",
				});
			}

			return NextResponse.json(
				{
					error:
						"Service temporarily unavailable. Please try again in a few moments.",
					code: "SIGNED_URL_CREATION_FAILED",
				},
				{ status: 500 }
			);
		}

		return NextResponse.json({
			signedUrl,
			token,
			materialId: material.id,
			filePath,
		});
	} catch (err) {
		// Map known transactional errors
		if (err instanceof Error) {
			if (err.message === "ERR_MATERIAL_INSERT_FAILED") {
				return NextResponse.json(
					{
						error: "Failed to create material record",
						code: "MATERIAL_INSERT_FAILED",
					},
					{ status: 500 }
				);
			}
			if (err.message === "ERR_MATERIAL_UPDATE_FAILED") {
				return NextResponse.json(
					{
						error: "Failed to update material file path",
						code: "MATERIAL_UPDATE_FAILED",
					},
					{ status: 500 }
				);
			}
		}
		logger.error("Materials presign operation failed", {
			message: err instanceof Error ? err.message : String(err),
			stack: err instanceof Error ? err.stack : undefined,
			route: "/api/materials/presign",
			method: "POST",
		});

		return NextResponse.json(
			{ error: "Upload preparation failed. Please try again." },
			{ status: 500 }
		);
	}
}
