/**
 * Course Management Analytics Events
 * Server-side only events for tracking course creation, management, and material uploads
 */

import { trackServerEvent } from "../posthog";

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

	updated: async (
		courseData: {
			courseId: string;
			fieldsChanged: string[];
			previousValues?: Record<string, unknown>;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"course_updated",
			{
				course_id: courseData.courseId,
				fields_changed: courseData.fieldsChanged,
				change_count: courseData.fieldsChanged.length,
				previous_values: courseData.previousValues,
				event_category: "product_usage",
			},
			userId
		);
	},

	deleted: async (
		courseId: string,
		properties: {
			materialCount?: number;
			weekCount?: number;
			courseAge?: number;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"course_deleted",
			{
				course_id: courseId,
				material_count: properties.materialCount,
				week_count: properties.weekCount,
				course_age_days: properties.courseAge,
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

	materialDeleted: async (
		materialData: {
			materialId: string;
			courseId: string;
			fileType?: string;
			hasContent?: boolean;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"material_deleted",
			{
				material_id: materialData.materialId,
				course_id: materialData.courseId,
				file_type: materialData.fileType,
				had_generated_content: materialData.hasContent,
				event_category: "product_usage",
			},
			userId
		);
	},

	weekCreated: async (
		weekData: {
			weekId: string;
			courseId: string;
			weekNumber: number;
			title?: string;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"course_week_created",
			{
				week_id: weekData.weekId,
				course_id: weekData.courseId,
				week_number: weekData.weekNumber,
				week_title: weekData.title,
				event_category: "product_usage",
			},
			userId
		);
	},

	weekDeleted: async (
		weekData: {
			weekId: string;
			courseId: string;
			weekNumber: number;
			materialCount?: number;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"course_week_deleted",
			{
				week_id: weekData.weekId,
				course_id: weekData.courseId,
				week_number: weekData.weekNumber,
				material_count: weekData.materialCount,
				event_category: "product_usage",
			},
			userId
		);
	},

	studySessionStarted: async (
		sessionData: {
			courseId: string;
			contentType?: "mcq" | "summary" | "notes" | "cuecard";
			materialId?: string;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"study_session_started",
			{
				course_id: sessionData.courseId,
				content_type: sessionData.contentType,
				material_id: sessionData.materialId,
				session_start_time: new Date().toISOString(),
				event_category: "engagement",
			},
			userId
		);
	},

	studySessionCompleted: async (
		sessionData: {
			courseId: string;
			contentType?: string;
			sessionDuration: number;
			itemsCompleted?: number;
			completionRate?: number;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"study_session_completed",
			{
				course_id: sessionData.courseId,
				content_type: sessionData.contentType,
				session_duration_minutes: sessionData.sessionDuration,
				items_completed: sessionData.itemsCompleted,
				completion_rate: sessionData.completionRate,
				event_category: "engagement",
			},
			userId
		);
	},

	progressUpdated: async (
		progressData: {
			courseId: string;
			progressPercentage: number;
			weekProgress?: Record<string, number>;
			lastActiveWeek?: number;
		},
		userId?: string
	) => {
		await trackServerEvent(
			"course_progress_updated",
			{
				course_id: progressData.courseId,
				progress_percentage: progressData.progressPercentage,
				week_progress: progressData.weekProgress,
				last_active_week: progressData.lastActiveWeek,
				event_category: "engagement",
			},
			userId
		);
	},
};
