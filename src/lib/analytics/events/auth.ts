/**
 * Authentication & User Analytics Events
 * Server-side only events for tracking user authentication and session management
 */

import { identifyUser, trackServerEvent } from "../posthog";

export const authEvents = {
	signup: async (
		method: "email" | "google",
		properties: {
			referrer?: string;
			source?: string;
			campaign?: string;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"user_signup",
			{
				signup_method: method,
				referrer: properties.referrer,
				source: properties.source,
				campaign: properties.campaign,
				event_category: "user_journey",
			},
			userId
		);

		// Identify the user for future tracking
		if (userId) {
			await identifyUser(userId, {
				signup_method: method,
				signup_date: new Date().toISOString(),
				referrer: properties.referrer,
				source: properties.source,
				campaign: properties.campaign,
			});
		}
	},

	login: async (
		method: "email" | "google",
		properties: {
			sessionId?: string;
			returnUrl?: string;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"user_login",
			{
				login_method: method,
				session_id: properties.sessionId,
				return_url: properties.returnUrl,
				event_category: "user_journey",
			},
			userId
		);
	},

	logout: async (
		properties: {
			sessionDuration?: number;
			reason?: "user_initiated" | "timeout" | "forced";
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"user_logout",
			{
				session_duration_minutes: properties.sessionDuration,
				logout_reason: properties.reason || "user_initiated",
				event_category: "user_journey",
			},
			userId
		);
	},

	emailVerified: async (
		properties: {
			verificationTime?: number;
			attempts?: number;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"email_verified",
			{
				verification_time_minutes: properties.verificationTime,
				verification_attempts: properties.attempts,
				event_category: "user_journey",
			},
			userId
		);
	},

	passwordReset: async (
		properties: {
			method?: "email" | "sms";
			success?: boolean;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"password_reset_requested",
			{
				reset_method: properties.method || "email",
				success: properties.success,
				event_category: "user_journey",
			},
			userId
		);
	},

	authError: async (
		errorType: string,
		properties: {
			errorMessage?: string;
			provider?: string;
			step?: string;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"auth_error",
			{
				error_type: errorType,
				error_message: properties.errorMessage,
				auth_provider: properties.provider,
				auth_step: properties.step,
				event_category: "error",
			},
			userId
		);
	},

	sessionExpired: async (
		properties: {
			sessionDuration?: number;
			lastActivity?: string;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"session_expired",
			{
				session_duration_minutes: properties.sessionDuration,
				last_activity: properties.lastActivity,
				event_category: "user_journey",
			},
			userId
		);
	},

	accountDeleted: async (
		properties: {
			reason?: string;
			accountAge?: number;
			dataRetained?: boolean;
		} = {},
		userId?: string
	) => {
		await trackServerEvent(
			"account_deleted",
			{
				deletion_reason: properties.reason,
				account_age_days: properties.accountAge,
				data_retained: properties.dataRetained,
				event_category: "user_journey",
			},
			userId
		);
	},
};
