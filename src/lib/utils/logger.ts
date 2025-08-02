/**
 * Pino-based logging utility with environment-aware levels and browser compatibility.
 * Patched for Next.js SSR compatibility.
 */

import pino from "pino";
import type { Logger as PinoLogger, WriteFn } from "pino";

/**
 * Creates a namespaced logger. Debug/info only in development, warn/error always shown.
 * SSR-safe implementation that avoids worker thread issues.
 */
const createLogger = (namespace?: string): PinoLogger => {
	const isDev = process.env.NODE_ENV === "development";
	const isBrowser = typeof window !== "undefined";
	const isSSR = typeof window === "undefined" && typeof global !== "undefined";

	const config: pino.LoggerOptions = {
		name: namespace || "StudyLoopAI",
		level: isDev ? "debug" : "info",

		// Browser-specific configuration
		...(isBrowser && {
			browser: {
				write: ((obj: object) => {
					const { time, level, msg, name, ...rest } = obj as Record<
						string,
						unknown
					>;
					const timestamp = new Date(
						time as string | number
					).toLocaleTimeString();
					const levelName = pino.levels.labels[level as number];
					const prefix = name ? `[${name}]` : "";
					const message = `${timestamp} ${prefix} ${msg || ""}`;

					// Use appropriate console method
					const consoleMethod =
						levelName === "error"
							? "error"
							: levelName === "warn"
								? "warn"
								: levelName === "debug"
									? "debug"
									: "info";

					// Log with context if available
					if (Object.keys(rest).length > 0) {
						console[consoleMethod](message, rest);
					} else {
						console[consoleMethod](message);
					}
				}) as WriteFn,
			},
		}),

		// Server-side configuration - avoid pino-pretty in SSR to prevent worker issues
		...(!isBrowser && {
			...(isDev &&
				!isSSR && {
					// Only use pino-pretty in pure Node.js, not during SSR
					transport: {
						target: "pino-pretty",
						options: {
							colorize: true,
							translateTime: "HH:MM:ss.l",
							ignore: "pid,hostname",
						},
					},
				}),
			// Fallback for SSR or production - simple JSON logging
			...((!isDev || isSSR) && {
				formatters: {
					level: (label: string) => ({ level: label }),
				},
			}),
		}),
	};

	try {
		return pino(config);
	} catch (error) {
		// Fallback to basic pino config if transport fails
		console.warn("Pino transport failed, falling back to basic config:", error);
		return pino({
			name: namespace || "StudyLoopAI",
			level: isDev ? "debug" : "info",
			...(isBrowser && {
				browser: {
					write: ((obj: object) => {
						console.info(JSON.stringify(obj));
					}) as WriteFn,
				},
			}),
		});
	}
};

/**
 * Default logger instance for general use.
 * Made lazy to avoid SSR issues with pino-pretty worker threads.
 */
let _logger: PinoLogger | null = null;
const logger = new Proxy({} as PinoLogger, {
	get(_target, prop) {
		if (!_logger) {
			_logger = createLogger();
		}
		return (_logger as PinoLogger)[prop as keyof PinoLogger];
	},
});

export { createLogger, logger };
export type { Logger } from "pino";
