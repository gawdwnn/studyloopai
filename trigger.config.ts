import type { TriggerConfig } from "@trigger.dev/sdk";

export const config: TriggerConfig = {
	project: "proj_nmhmphfupxlqbetvlsgr",
	logLevel: "info",
	maxDuration: 600,
	retries: {
		enabledInDev: true,
		default: {
			maxAttempts: 1,
			minTimeoutInMs: 1000,
			maxTimeoutInMs: 10000,
			factor: 2,
		},
	},
	build: {
		external: ["pino", "pino-pretty"],
	},
};
