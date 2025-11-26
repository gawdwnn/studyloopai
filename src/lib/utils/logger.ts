/**
 * Pino logger with PostHog Error Tracking integration.
 *
 * Usage:
 * - Standard: `logger.error({ err, ...context }, 'message')`
 * - Critical errors: `logAndTrackError(err, 'message', context)` - Tracks to PostHog
 * - Namespaced: `createLogger('feature-name')`
 */

import type { Logger as PinoLogger } from "pino";
import pino from "pino";

export type LogContext = Record<string, unknown>;

const createLogger = (namespace = "StudyLoopAI"): PinoLogger => {
	const isDev = process.env.NODE_ENV === "development";
	const isBrowser = typeof window !== "undefined";

	// Browser logging
	if (isBrowser) {
		return pino({
			name: namespace,
			level: isDev ? "debug" : "warn",
			browser: {
				write: (obj: object) => {
					const logObj = obj as {
						level: number;
						msg?: string;
						time: number;
						pid: number;
						hostname: string;
						[key: string]: unknown;
					};
					const {
						level,
						msg,
						time,
						pid,
						hostname,
						...contextWithoutPinoProps
					} = logObj;
					const levelName = pino.levels.labels[level];
					const message = `[${namespace}] ${msg || ""}`;

					const logArgs: (string | Record<string, unknown>)[] = [message];
					if (Object.keys(contextWithoutPinoProps).length > 0) {
						logArgs.push(contextWithoutPinoProps);
					}

					switch (levelName) {
						case "fatal":
						case "error":
							console.error(...logArgs);
							break;
						case "warn":
							console.warn(...logArgs);
							break;
						case "info":
							console.info(...logArgs);
							break;
						case "debug":
						case "trace":
							console.debug(...logArgs);
							break;
						default:
							console.info(...logArgs);
					}
				},
			},
		});
	}

	// Server logging
	return pino({
		name: namespace,
		level: isDev ? "debug" : "info",
		base: {
			service: "studyloopai",
			env: process.env.NODE_ENV,
			version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
		},
		redact: {
			paths: [
				"req.headers.authorization",
				"authorization",
				"cookie",
				"cookies",
				"password",
				"token",
				"apiKey",
				"api_key",
				"secret",
				"accessToken",
				"refreshToken",
			],
			censor: "[REDACTED]",
		},
		...(isDev && {
			transport: {
				target: "pino-pretty",
				options: {
					colorize: true,
					translateTime: "HH:MM:ss.l",
					ignore: "pid,hostname",
					errorLikeObjectKeys: ["err", "error", "exception"],
					sync: true,
				},
			},
		}),
	});
};

const logger = createLogger();

/**
 * Logs error and tracks to PostHog Error Tracking.
 * Use for critical errors (payments, auth, data loss). Regular errors use `logger.error()`.
 */
async function logAndTrackError(
	err: unknown,
	message: string,
	context: LogContext = {}
) {
	logger.error({ err, ...context }, message);

	// Only load PostHog on server-side (dynamic import prevents client bundling)
	if (typeof window === "undefined") {
		try {
			const { posthog } = await import("@/lib/analytics/posthog");

			if (posthog) {
				const distinctId = (context.userId as string | undefined) ?? "server";

				if (err instanceof Error) {
					posthog.capture({
						distinctId,
						event: "$exception",
						properties: {
							$exception_message: err.message,
							$exception_type: err.constructor.name,
							$exception_stack_trace_raw: err.stack,
							$exception_level: "error",
							context_message: message,
							...context,
						},
					});
				} else {
					posthog.capture({
						distinctId,
						event: "$exception",
						properties: {
							$exception_message: String(err),
							$exception_type: typeof err,
							$exception_level: "error",
							context_message: message,
							...context,
						},
					});
				}

				// Ensure events are flushed in serverless environments
				await posthog.shutdown();
			}
		} catch {
			// Silently fail - PostHog errors should not break logging
		}
	}
}

export type { Logger } from "pino";
export { createLogger, logAndTrackError, logger };
