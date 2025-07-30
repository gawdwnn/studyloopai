/**
 * Pino-based logging utility with environment-aware levels and browser compatibility.
 */

import pino from "pino";
import type { Logger as PinoLogger, WriteFn } from "pino";

/**
 * Creates a namespaced logger. Debug/info only in development, warn/error always shown.
 */
const createLogger = (namespace?: string): PinoLogger => {
	const isDev = process.env.NODE_ENV === "development";
	const isBrowser = typeof window !== "undefined";

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

		// Server-side pretty printing in development
		...(!isBrowser &&
			isDev && {
				transport: {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "HH:MM:ss.l",
						ignore: "pid,hostname",
					},
				},
			}),

		// Production JSON logging (server-side only)
		...(!isBrowser &&
			!isDev && {
				formatters: {
					level: (label: string) => ({ level: label }),
				},
			}),
	};

	return pino(config);
};

/**
 * Default logger instance for general use.
 */
const logger = createLogger();

export { createLogger, logger };
export type { Logger } from "pino";
