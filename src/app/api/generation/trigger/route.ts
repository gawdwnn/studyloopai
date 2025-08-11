/**
 * On-Demand Generation API
 *
 * Triggers generation for specific content types when users need them
 * for immediate session startup
 */

import { db } from "@/db";
import { configurationSource, courseMaterials, courseWeeks } from "@/db/schema";
import { initializeFeatureTracking } from "@/lib/actions/course-week-features";
import { persistSelectiveConfig } from "@/lib/actions/generation-config";
import { checkQuotaAndConsume } from "@/lib/actions/plans";
import { checkAIRateLimit } from "@/lib/rate-limit";
import { getServerClient } from "@/lib/supabase/server";
import {
	API_ERROR_CODES,
	createQuotaErrorResponse,
} from "@/lib/types/api-errors";
import { logger } from "@/lib/utils/logger";
import { SelectiveGenerationConfigSchema } from "@/lib/validation/generation-config";
import { tasks } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TriggerGenerationSchema = z.object({
	courseId: z.string().uuid("Invalid course ID"),
	weekId: z.string().uuid("Invalid week ID"),
	featureTypes: z
		.array(
			z.enum([
				"goldenNotes",
				"cuecards",
				"mcqs",
				"openQuestions",
				"summaries",
				"conceptMaps",
			])
		)
		.min(1, "At least one content type is required"),
	config: SelectiveGenerationConfigSchema,
	configSource: z.enum(configurationSource.enumValues),
});

export async function POST(req: NextRequest) {
	try {
		const json = await req.json();
		const body = TriggerGenerationSchema.parse(json);

		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
		}

		// Apply rate limiting for AI content generation - token bucket algorithm
		const rateLimitResult = await checkAIRateLimit(user.id);

		if (!rateLimitResult.success) {
			const resetMinutes = rateLimitResult.reset
				? Math.ceil((rateLimitResult.reset - Date.now()) / 60000)
				: 60;

			return NextResponse.json(
				{
					error: "Rate limit exceeded",
					code: API_ERROR_CODES.RATE_LIMIT_EXCEEDED,
					details: {
						limit: rateLimitResult.limit,
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
						"X-RateLimit-Limit": rateLimitResult.limit.toString(),
						"X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
						"X-RateLimit-Reset": rateLimitResult.reset?.toString() || "",
						"Retry-After": Math.ceil(
							((rateLimitResult.reset || Date.now()) - Date.now()) / 1000
						).toString(),
					},
				}
			);
		}

		// Check AI generation quota before proceeding (charge per requested feature)
		const requestedGenerations = body.featureTypes.length;
		const quotaCheck = await checkQuotaAndConsume(
			user.id,
			"ai_generations",
			requestedGenerations
		);
		if (!quotaCheck.allowed && quotaCheck.quotaDetails) {
			const quotaError = createQuotaErrorResponse(
				quotaCheck.quotaDetails.quotaType,
				quotaCheck.quotaDetails.currentUsage,
				quotaCheck.quotaDetails.quotaLimit,
				quotaCheck.quotaDetails.planId
			);
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

		// Get materials for this courseId and weekId, ensuring week has course materials
		const materials = await db
			.select({
				id: courseMaterials.id,
			})
			.from(courseMaterials)
			.innerJoin(courseWeeks, eq(courseWeeks.id, courseMaterials.weekId))
			.where(
				and(
					eq(courseMaterials.weekId, body.weekId),
					eq(courseMaterials.courseId, body.courseId),
					eq(courseMaterials.uploadedBy, user.id),
					eq(courseWeeks.hasMaterials, true)
				)
			);

		if (materials.length === 0) {
			return NextResponse.json(
				{
					error: "No materials found for this course and week",
					code: "MATERIALS_NOT_FOUND",
				},
				{ status: 400 }
			);
		}

		const selectiveConfig = body.config;

		// Persist the config to database with on-demand metadata
		const configId = await persistSelectiveConfig(
			selectiveConfig,
			body.weekId,
			body.courseId,
			user.id,
			body.configSource,
			{
				source: "on_demand_generation",
				trigger: "adaptive_learning_session_setup",
				userAgent: "on-demand-generation-api",
			}
		);
		if (!configId) {
			return NextResponse.json(
				{
					error: "Failed to persist generation configuration",
					code: "CONFIG_PERSIST_FAILED",
				},
				{ status: 500 }
			);
		}

		// Trigger the AI content orchestrator
		const { aiContentOrchestrator } = await import(
			"@/trigger/ai-content-orchestrator"
		);

		let handle: { id: string; publicAccessToken?: string };
		try {
			handle = await tasks.trigger(aiContentOrchestrator.id, {
				weekId: body.weekId,
				courseId: body.courseId,
				materialIds: materials.map((m) => m.id),
				configId,
				userId: user.id,
			});
		} catch (taskErr) {
			logger.error("Failed to queue orchestrator task", {
				message: taskErr instanceof Error ? taskErr.message : String(taskErr),
				route: "/api/generation/trigger",
				userId: user.id,
				courseId: body.courseId,
				weekId: body.weekId,
			});
			return NextResponse.json(
				{
					error: "Failed to queue generation task",
					code: "TASK_TRIGGER_FAILED",
				},
				{ status: 502 }
			);
		}

		// Initialize feature tracking
		try {
			await initializeFeatureTracking(body.courseId, body.weekId, configId);
		} catch (ftErr) {
			logger.error("Failed to initialize feature tracking", {
				message: ftErr instanceof Error ? ftErr.message : String(ftErr),
				route: "/api/generation/trigger",
			});
			// Non-critical: do not fail the response
		}

		const response = NextResponse.json({
			success: true,
			runId: handle.id,
			publicAccessToken: handle.publicAccessToken,
		});

		// Add rate limit headers to successful responses
		response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
		response.headers.set(
			"X-RateLimit-Remaining",
			rateLimitResult.remaining.toString()
		);
		if (rateLimitResult.reset) {
			response.headers.set(
				"X-RateLimit-Reset",
				rateLimitResult.reset.toString()
			);
		}

		return response;
	} catch (error) {
		logger.error("On-demand generation trigger failed", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			route: "/api/generation/trigger",
			method: "POST",
		});

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}
