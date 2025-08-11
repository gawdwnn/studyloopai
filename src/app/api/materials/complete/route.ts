"use server";

import { db } from "@/db";
import { configurationSource, courseMaterials, courseWeeks } from "@/db/schema";
import { initializeFeatureTracking } from "@/lib/actions/course-week-features";
import { persistSelectiveConfig } from "@/lib/actions/generation-config";
import { checkQuotaAndConsume } from "@/lib/actions/plans";
import { checkAPIStrictRateLimit } from "@/lib/rate-limit";
import { getServerClient } from "@/lib/supabase/server";
import {
	API_ERROR_CODES,
	createQuotaErrorResponse,
} from "@/lib/types/api-errors";
import { logger } from "@/lib/utils/logger";
import { SelectiveGenerationConfigSchema } from "@/lib/validation/generation-config";
import type { ingestCourseMaterials } from "@/trigger/ingest-course-materials";
import { tasks } from "@trigger.dev/sdk";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
	materialIds: z
		.array(z.string().uuid("Invalid material ID"))
		.min(1, "At least one material ID is required")
		.max(5, "Maximum 5 materials allowed per batch"),
	weekId: z.string().uuid("Invalid week ID"),
	courseId: z.string().uuid("Invalid course ID"),
	selectiveConfig: SelectiveGenerationConfigSchema,
	configSource: z.enum(configurationSource.enumValues),
});

export async function POST(req: NextRequest) {
	try {
		const json = await req.json();
		const body = BodySchema.parse(json);

		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user)
			return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

		// Strategic rate limiting to prevent processing abuse (not for quota enforcement)
		const rateLimitResult = await checkAPIStrictRateLimit(user.id);
		if (!rateLimitResult.success) {
			const resetMinutes = rateLimitResult.reset
				? Math.ceil((rateLimitResult.reset - Date.now()) / 60000)
				: 60;

			return NextResponse.json(
				{
					error: "Too many processing requests",
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

		// Atomic DB updates: mark materials completed and mark week as having materials
		const updatedMaterials = await db.transaction(async (tx) => {
			// 1) Mark materials upload status as completed for owned materials in this course/week
			const materials = await tx
				.update(courseMaterials)
				.set({
					uploadStatus: "completed",
					updatedAt: new Date(),
				})
				.where(
					and(
						inArray(courseMaterials.id, body.materialIds),
						eq(courseMaterials.uploadedBy, user.id),
						eq(courseMaterials.courseId, body.courseId),
						eq(courseMaterials.weekId, body.weekId)
					)
				)
				.returning({
					id: courseMaterials.id,
					filePath: courseMaterials.filePath,
					contentType: courseMaterials.contentType,
				});

			if (materials.length === 0) {
				throw new Error("ERR_MATERIALS_NOT_FOUND");
			}
			if (materials.length !== body.materialIds.length) {
				// Partial match indicates some materials are not owned or do not belong to the target week/course
				throw new Error("ERR_PARTIAL_MATERIALS_UPDATE");
			}

			// 2) Mark course week as having materials
			const updatedWeek = await tx
				.update(courseWeeks)
				.set({ hasMaterials: true })
				.where(
					and(
						eq(courseWeeks.id, body.weekId),
						eq(courseWeeks.courseId, body.courseId)
					)
				)
				.returning({ id: courseWeeks.id });

			if (updatedWeek.length === 0) {
				throw new Error("ERR_WEEK_NOT_FOUND");
			}

			return materials;
		});

		// Enforce AI generation quota based on selected features before triggering pipeline
		try {
			const selected = body.selectiveConfig.selectedFeatures;
			const requestedGenerations = [
				selected.goldenNotes,
				selected.cuecards,
				selected.mcqs,
				selected.openQuestions,
				selected.summaries,
				selected.conceptMaps,
			].filter(Boolean).length;

			if (requestedGenerations > 0) {
				const quota = await checkQuotaAndConsume(
					user.id,
					"ai_generations",
					requestedGenerations
				);
				if (!quota.allowed && quota.quotaDetails) {
					const quotaError = createQuotaErrorResponse(
						quota.quotaDetails.quotaType,
						quota.quotaDetails.currentUsage,
						quota.quotaDetails.quotaLimit,
						quota.quotaDetails.planId
					);
					return NextResponse.json(quotaError, { status: 429 });
				}
			}
		} catch (quotaErr) {
			logger.error(
				"AI generation quota check failed during materials complete",
				{
					message:
						quotaErr instanceof Error ? quotaErr.message : String(quotaErr),
					route: "/api/materials/complete",
				}
			);
			// Gracefully degrade: do not block upload completion if quota service is unavailable
		}

		// Persist the user's selected config to database
		const savedConfigId = await persistSelectiveConfig(
			body.selectiveConfig,
			body.weekId,
			body.courseId,
			user.id,
			body.configSource,
			{
				source: "material_upload_completion",
				trigger: "course_material_upload_wizard",
				userAgent: "material-upload-api",
			}
		);
		if (!savedConfigId) {
			return NextResponse.json(
				{
					error: "Failed to persist generation configuration",
					code: "CONFIG_PERSIST_FAILED",
				},
				{ status: 500 }
			);
		}

		// Trigger ingest task for those materials
		let handle: { id: string; publicAccessToken?: string };
		try {
			handle = await tasks.trigger<typeof ingestCourseMaterials>(
				"ingest-course-materials",
				{
					userId: user.id,
					materials: updatedMaterials.map((m) => ({
						materialId: m.id,
						filePath: m.filePath as string,
						contentType: m.contentType as string,
					})),
					configId: savedConfigId,
				}
			);
		} catch (taskErr) {
			logger.error("Failed to queue ingest task", {
				message: taskErr instanceof Error ? taskErr.message : String(taskErr),
				route: "/api/materials/complete",
				userId: user.id,
				courseId: body.courseId,
				weekId: body.weekId,
			});
			return NextResponse.json(
				{
					error: "Failed to queue processing task",
					code: "TASK_TRIGGER_FAILED",
				},
				{ status: 502 }
			);
		}

		// Initialize feature tracking
		try {
			await initializeFeatureTracking(
				body.courseId,
				body.weekId,
				savedConfigId
			);
		} catch (ftErr) {
			logger.error("Failed to initialize feature tracking", {
				message: ftErr instanceof Error ? ftErr.message : String(ftErr),
				route: "/api/materials/complete",
			});
			// Non-critical: do not fail the response
		}

		return NextResponse.json({
			success: true,
			runId: handle.id,
			publicAccessToken: handle.publicAccessToken,
			weekId: body.weekId,
			courseId: body.courseId,
		});
	} catch (err) {
		// Map known transactional errors to structured responses
		if (err instanceof Error) {
			if (err.message === "ERR_MATERIALS_NOT_FOUND") {
				return NextResponse.json(
					{
						error: "No matching materials found or already completed",
						code: "MATERIALS_NOT_FOUND",
					},
					{ status: 404 }
				);
			}
			if (err.message === "ERR_PARTIAL_MATERIALS_UPDATE") {
				return NextResponse.json(
					{
						error:
							"Some materials are invalid for this course/week or not owned by user",
						code: "PARTIAL_UPDATE",
					},
					{ status: 409 }
				);
			}
			if (err.message === "ERR_WEEK_NOT_FOUND") {
				return NextResponse.json(
					{
						error: "Course week not found for provided course/week",
						code: "WEEK_NOT_FOUND",
					},
					{ status: 404 }
				);
			}
		}
		logger.error("Materials completion operation failed", {
			message: err instanceof Error ? err.message : String(err),
			stack: err instanceof Error ? err.stack : undefined,
			route: "/api/materials/complete",
			method: "POST",
		});

		return NextResponse.json(
			{ error: "Failed to complete upload. Please try again." },
			{ status: 500 }
		);
	}
}
