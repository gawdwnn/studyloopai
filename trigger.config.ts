import type { TriggerConfig } from "@trigger.dev/sdk";

export const config: TriggerConfig = {
	project: "proj_nmhmphfupxlqbetvlsgr",
	logLevel: "info",
	maxDuration: 300, // Reduced global default to 5 minutes
	retries: {
		enabledInDev: true,
		default: {
			maxAttempts: 3,
			minTimeoutInMs: 1000,
			maxTimeoutInMs: 30000, // Increased for AI tasks
			factor: 2,
			randomize: true, // Add jitter to prevent thundering herd
		},
	},
	build: {
		external: ["pino", "pino-pretty"],
	},
};
