/**
 * PostHog Events API - Server-side only
 * This file should only be imported in server-side code (API routes, server actions)
 * For client-side tracking, use the PostHog client directly via usePostHogSafe hook
 */

import {
	type PostHogEventName,
	identifyUser,
	setUserProperties,
	trackServerEvent,
} from "./posthog";

export type EventName = PostHogEventName;

// Enhanced Billing Analytics with Revenue Tracking
export const billingEvents = {
	checkoutStarted: async (
		planId: string,
		planPrice?: number,
		currency = "USD",
		userId?: string
	) => {
		await trackServerEvent(
			"checkout_started",
			{
				plan_id: planId,
				plan_price: planPrice,
				currency,
				event_category: "conversion",
				funnel_step: "checkout_initiated",
			},
			userId
		);
	},

	checkoutCompleted: async (
		planId: string,
		subscriptionId: string,
		revenue: number,
		currency = "USD",
		userId?: string
	) => {
		await trackServerEvent(
			"checkout_completed",
			{
				plan_id: planId,
				subscription_id: subscriptionId,
				revenue,
				currency,
				event_category: "conversion",
				funnel_step: "checkout_completed",
			},
			userId
		);
	},

	subscriptionCreated: async (
		planId: string,
		subscriptionId: string,
		revenue: number,
		currency = "USD",
		userId?: string
	) => {
		await trackServerEvent(
			"subscription_started",
			{
				plan_id: planId,
				subscription_id: subscriptionId,
				revenue,
				currency,
				event_category: "conversion",
				subscription_status: "active",
			},
			userId
		);

		// Also set user properties for segmentation
		if (userId) {
			await setUserProperties(userId, {
				subscription_plan: planId,
				subscription_status: "active",
				subscription_id: subscriptionId,
				ltv: revenue, // Lifetime value tracking
			});
		}
	},

	subscriptionCancelled: async (
		reason?: string,
		subscriptionId?: string,
		userId?: string
	) => {
		await trackServerEvent(
			"subscription_cancelled",
			{
				cancellation_reason: reason,
				subscription_id: subscriptionId,
				event_category: "conversion",
				subscription_status: "cancelled",
			},
			userId
		);

		// Update user properties
		if (userId) {
			await setUserProperties(userId, {
				subscription_status: "cancelled",
				cancellation_reason: reason,
			});
		}
	},

	planUpgraded: async (
		fromPlan: string,
		toPlan: string,
		newRevenue: number,
		currency = "USD",
		userId?: string
	) => {
		await trackServerEvent(
			"plan_upgraded",
			{
				from_plan: fromPlan,
				to_plan: toPlan,
				revenue_increase: newRevenue,
				currency,
				event_category: "conversion",
				subscription_status: "upgraded",
			},
			userId
		);

		// Update user properties
		if (userId) {
			await setUserProperties(userId, {
				subscription_plan: toPlan,
				subscription_status: "active",
				last_upgrade_date: new Date().toISOString(),
			});
		}
	},

	paymentFailed: async (
		errorType: string,
		planId?: string,
		userId?: string
	) => {
		await trackServerEvent(
			"payment_failed",
			{
				error_type: errorType,
				plan_id: planId,
				event_category: "conversion",
				payment_status: "failed",
			},
			userId
		);
	},
};

// AI Content Generation Analytics
export const aiEvents = {
	contentGenerated: async (
		contentType: "mcq" | "summary" | "notes" | "cuecard" | "concept_map",
		properties: {
			courseId: string;
			materialId?: string;
			processingTime?: number;
			wordCount?: number;
			modelUsed?: string;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"ai_content_generated",
			{
				content_type: contentType,
				course_id: properties.courseId,
				material_id: properties.materialId,
				processing_time_ms: properties.processingTime,
				word_count: properties.wordCount,
				model_used: properties.modelUsed,
				event_category: "product_usage",
			},
			userId
		);
	},

	contentRegenerated: async (
		contentType: string,
		reason: "quality" | "user_request" | "error",
		userId?: string
	) => {
		await trackServerEvent(
			"ai_content_regenerated",
			{
				content_type: contentType,
				regeneration_reason: reason,
				event_category: "product_usage",
			},
			userId
		);
	},
};

// User Authentication Analytics
export const authEvents = {
	signup: async (
		method: "email" | "google",
		referrer?: string,
		userId?: string
	) => {
		await trackServerEvent(
			"user_signup",
			{
				signup_method: method,
				referrer,
				event_category: "user_journey",
			},
			userId
		);

		// Identify the user for future tracking
		if (userId) {
			await identifyUser(userId, {
				signup_method: method,
				signup_date: new Date().toISOString(),
				referrer,
			});
		}
	},

	login: async (method: "email" | "google", userId?: string) => {
		await trackServerEvent(
			"user_login",
			{
				login_method: method,
				event_category: "user_journey",
			},
			userId
		);
	},

	logout: async (sessionDuration?: number, userId?: string) => {
		await trackServerEvent(
			"user_logout",
			{
				session_duration_minutes: sessionDuration,
				event_category: "user_journey",
			},
			userId
		);
	},
};

// Course Management Analytics
export const courseEvents = {
	created: async (
		courseData: {
			courseId: string;
			title: string;
			weekCount?: number;
			isTemplate?: boolean;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"course_created",
			{
				course_id: courseData.courseId,
				course_title: courseData.title,
				week_count: courseData.weekCount,
				is_template: courseData.isTemplate,
				event_category: "product_usage",
			},
			userId
		);
	},

	deleted: async (
		courseId: string,
		materialCount?: number,
		userId?: string
	) => {
		await trackServerEvent(
			"course_deleted",
			{
				course_id: courseId,
				material_count: materialCount,
				event_category: "product_usage",
			},
			userId
		);
	},

	materialUploaded: async (
		materialData: {
			materialId: string;
			courseId: string;
			fileType: string;
			fileSize?: number;
			processingStatus?: "success" | "failed";
		},
		userId?: string
	) => {
		await trackServerEvent(
			"material_uploaded",
			{
				material_id: materialData.materialId,
				course_id: materialData.courseId,
				file_type: materialData.fileType,
				file_size_bytes: materialData.fileSize,
				processing_status: materialData.processingStatus,
				event_category: "product_usage",
			},
			userId
		);
	},
};
