import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Input sanitization transform
const sanitizeString = (schema: z.ZodString) =>
	schema.transform((val) => val.trim().replace(/\0/g, ""));

export const env = createEnv({
	/**
	 * Server-side environment variables
	 * Only available on the server-side
	 */
	server: {
		DATABASE_URL: sanitizeString(z.string().url()),
		DEV_DATABASE_PASSWORD: sanitizeString(z.string().min(1)).optional(),
		PROD_DATABASE_PASSWORD: sanitizeString(z.string().min(1)).optional(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		SUPABASE_SERVICE_ROLE_KEY: sanitizeString(z.string().min(1)),
		OPENAI_API_KEY: sanitizeString(z.string().min(1)).optional(),
		XAI_API_KEY: sanitizeString(z.string().min(1)).optional(),
		MISTRAL_API_KEY: sanitizeString(z.string().min(1)).optional(),
		ANTHROPIC_API_KEY: sanitizeString(z.string().min(1)).optional(),
		UPSTASH_REDIS_REST_URL: sanitizeString(z.string().url()).optional(),
		UPSTASH_REDIS_REST_TOKEN: sanitizeString(z.string().min(1)).optional(),
		TRIGGER_SECRET_KEY: sanitizeString(z.string().min(1)).optional(),
		TRIGGER_PROJECT_ID: sanitizeString(z.string().min(1)).optional(),
		POLAR_ACCESS_TOKEN: sanitizeString(z.string().min(1)).optional(),
		POLAR_WEBHOOK_SECRET: sanitizeString(z.string().min(1)).optional(),
		SANDBOX_POLAR_ACCESS_TOKEN: sanitizeString(z.string().min(1)).optional(),
		SANDBOX_POLAR_WEBHOOK_SECRET: sanitizeString(z.string().min(1)).optional(),
		RESEND_API_KEY: sanitizeString(z.string().min(1)).optional(),
		SUPABASE_DEV_PROJECT_REF: sanitizeString(z.string().min(1)).optional(),
		SUPABASE_PROD_PROJECT_REF: sanitizeString(z.string().min(1)).optional(),
		POSTHOG_API_KEY: sanitizeString(z.string().min(1)).optional(),
		POSTHOG_HOST: sanitizeString(z.string().url()).optional(),
		FIRECRAWL_API_KEY: sanitizeString(z.string().min(1)).optional(),
	},

	/**
	 * Client-side environment variables
	 * Exposed to the client-side
	 */
	client: {
		NEXT_PUBLIC_SITE_URL: sanitizeString(z.string().url()),
		NEXT_PUBLIC_SUPABASE_URL: sanitizeString(z.string().url()),
		NEXT_PUBLIC_SUPABASE_ANON_KEY: sanitizeString(z.string().min(1)),
		NEXT_PUBLIC_POLAR_ORGANIZATION_ID: sanitizeString(
			z.string().min(1)
		).optional(),
		NEXT_PUBLIC_SANDBOX_POLAR_ORGANIZATION_ID: sanitizeString(
			z.string().min(1)
		).optional(),
		NEXT_PUBLIC_TRIGGER_API_URL: sanitizeString(z.string().url()).optional(),
		NEXT_PUBLIC_POSTHOG_KEY: sanitizeString(z.string().min(1)).optional(),
		NEXT_PUBLIC_POSTHOG_HOST: sanitizeString(z.string().url()).optional(),
	},

	/**
	 * Runtime environment variables
	 * What to validate at runtime
	 */
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		DEV_DATABASE_PASSWORD: process.env.DEV_DATABASE_PASSWORD,
		PROD_DATABASE_PASSWORD: process.env.PROD_DATABASE_PASSWORD,
		NODE_ENV: process.env.NODE_ENV,
		SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		XAI_API_KEY: process.env.XAI_API_KEY,
		MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
		UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
		UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
		TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
		TRIGGER_PROJECT_ID: process.env.TRIGGER_PROJECT_ID,
		POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN,
		POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
		SANDBOX_POLAR_ACCESS_TOKEN: process.env.SANDBOX_POLAR_ACCESS_TOKEN,
		SANDBOX_POLAR_WEBHOOK_SECRET: process.env.SANDBOX_POLAR_WEBHOOK_SECRET,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		SUPABASE_DEV_PROJECT_REF: process.env.SUPABASE_DEV_PROJECT_REF,
		SUPABASE_PROD_PROJECT_REF: process.env.SUPABASE_PROD_PROJECT_REF,
		POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
		POSTHOG_HOST: process.env.POSTHOG_HOST,
		FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
		NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		NEXT_PUBLIC_POLAR_ORGANIZATION_ID:
			process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID,
		NEXT_PUBLIC_SANDBOX_POLAR_ORGANIZATION_ID:
			process.env.NEXT_PUBLIC_SANDBOX_POLAR_ORGANIZATION_ID,
		NEXT_PUBLIC_TRIGGER_API_URL: process.env.NEXT_PUBLIC_TRIGGER_API_URL,
		NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
		NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
	},

	/**
	 * Skip validation during build time, Edge Runtime, and Trigger.dev runtime
	 * This prevents build failures when environment variables aren't available
	 */
	skipValidation:
		!!process.env.SKIP_ENV_VALIDATION ||
		process.env.NODE_ENV === undefined ||
		// Skip validation in Trigger.dev runtime environment
		(typeof process !== "undefined" &&
			!!process.env.TRIGGER_SECRET_KEY &&
			!process.env.NEXT_PUBLIC_SITE_URL),
});

// Export types for convenience
export type Env = typeof env;

export type ServerEnv = {
	[K in keyof typeof env as K extends `NEXT_PUBLIC_${string}`
		? never
		: K]: (typeof env)[K];
};

export type ClientEnv = {
	[K in keyof typeof env as K extends `NEXT_PUBLIC_${string}`
		? K
		: never]: (typeof env)[K];
};
