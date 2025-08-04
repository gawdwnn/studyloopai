/**
 * Simple Pino logger for error logging across all environments.
 */

import pino from "pino";
import type { Logger as PinoLogger } from "pino";

/**
 * Creates a simple logger for error logging.
 */
const createLogger = (namespace = "StudyLoopAI"): PinoLogger => {
	const isDev = process.env.NODE_ENV === "development";
	const isBrowser = typeof window !== "undefined";

	// Browser: Simple console logging
	if (isBrowser) {
		return pino({
			name: namespace,
			level: isDev ? "debug" : "warn",
			browser: {
				write: (obj: object) => {
					const logObj = obj as {
						level: number;
						msg?: string;
						[key: string]: unknown;
					};
					const levelName = pino.levels.labels[logObj.level];
					const message = `[${namespace}] ${logObj.msg || ""}`;

					switch (levelName) {
						case "fatal":
						case "error":
							console.error(message, logObj);
							break;
						case "warn":
							console.warn(message, logObj);
							break;
						case "info":
							console.info(message, logObj);
							break;
						case "debug":
						case "trace":
							console.debug(message, logObj);
							break;
						default:
							console.info(message, logObj);
					}
				},
			},
		});
	}

	// Server: Pretty printing in dev, JSON in production
	return pino({
		name: namespace,
		level: isDev ? "debug" : "error",
		...(isDev && {
			transport: {
				target: "pino-pretty",
				options: {
					colorize: true,
					translateTime: "HH:MM:ss.l",
					ignore: "pid,hostname",
					sync: true,
				},
			},
		}),
	});
};

/**
 * Default logger instance for general use.
 */
const logger = createLogger();

export { createLogger, logger };
export type { Logger } from "pino";
