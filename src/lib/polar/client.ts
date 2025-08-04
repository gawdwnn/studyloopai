import { env } from "@/env";
import { Polar } from "@polar-sh/sdk";

interface PolarConfig {
	accessToken: string;
	organizationId: string;
	webhookSecret: string;
}

const getPolarConfig = (): PolarConfig => {
	return {
		accessToken: env.POLAR_ACCESS_TOKEN || "",
		organizationId: env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID || "",
		webhookSecret: env.POLAR_WEBHOOK_SECRET || "",
	};
};

export const createPolarClient = (): Polar => {
	const config = getPolarConfig();

	// Determine if we're using sandbox based on NODE_ENV or explicit sandbox detection
	const isProduction = env.NODE_ENV === "production";

	return new Polar({
		accessToken: config.accessToken,
		...(!isProduction && { server: "sandbox" }),
	});
};

// Configuration getter for scripts and utilities
export const getPolarConfiguration = (): PolarConfig => {
	return getPolarConfig();
};
