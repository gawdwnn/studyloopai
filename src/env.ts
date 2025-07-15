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
		PROD_DATABASE_URL: sanitizeString(z.string().url()).optional(),
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		SUPABASE_SERVICE_ROLE_KEY: sanitizeString(z.string().min(1)),
		OPENAI_API_KEY: sanitizeString(z.string().min(1)).optional(),
		XAI_API_KEY: sanitizeString(z.string().min(1)).optional(),
		UPSTASH_REDIS_REST_URL: sanitizeString(z.string().url()).optional(),
		UPSTASH_REDIS_REST_TOKEN: sanitizeString(z.string().min(1)).optional(),
		TRIGGER_SECRET_KEY: sanitizeString(z.string().min(1)).optional(),
		TRIGGER_PROJECT_ID: sanitizeString(z.string().min(1)).optional(),
		STRIPE_SECRET_KEY: sanitizeString(z.string().min(1)).optional(),
		STRIPE_WEBHOOK_SECRET: sanitizeString(z.string().min(1)).optional(),
		RESEND_API_KEY: sanitizeString(z.string().min(1)).optional(),
	},

	/**
	 * Client-side environment variables
	 * Exposed to the client-side
	 */
	client: {
		NEXT_PUBLIC_SITE_URL: sanitizeString(z.string().url()),
		NEXT_PUBLIC_SUPABASE_URL: sanitizeString(z.string().url()),
		NEXT_PUBLIC_SUPABASE_ANON_KEY: sanitizeString(z.string().min(1)),
		NEXT_PUBLIC_TRIGGER_PROJECT_ID: sanitizeString(z.string().min(1)).optional(),
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: sanitizeString(z.string().min(1)).optional(),
	},

	/**
	 * Runtime environment variables
	 * What to validate at runtime
	 */
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		PROD_DATABASE_URL: process.env.PROD_DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		XAI_API_KEY: process.env.XAI_API_KEY,
		UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
		UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
		TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
		TRIGGER_PROJECT_ID: process.env.TRIGGER_PROJECT_ID,
		STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
		STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		NEXT_PUBLIC_TRIGGER_PROJECT_ID: process.env.NEXT_PUBLIC_TRIGGER_PROJECT_ID,
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
	},

	/**
	 * Run in Edge Runtime
	 * Skip validation in Edge Runtime
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

// Export types for convenience
export type Env = typeof env;
export type ServerEnv = typeof env & {
	[K in keyof typeof env]: K extends `NEXT_PUBLIC_${string}` ? never : (typeof env)[K];
};
export type ClientEnv = {
	[K in keyof typeof env as K extends `NEXT_PUBLIC_${string}` ? K : never]: (typeof env)[K];
};
