import { describe, expect, it } from "bun:test";
import { z } from "zod";

describe("Environment Configuration", () => {
	describe("Environment Schema Validation", () => {
		it("should create proper schema structure", () => {
			// Test schema creation without validation
			const sanitizeString = (schema: z.ZodString) =>
				schema.transform((val) => val.trim().replace(/\0/g, ""));

			expect(() => {
				const testSchema = {
					server: {
						DATABASE_URL: sanitizeString(z.string().url()),
						NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
					},
					client: {
						NEXT_PUBLIC_SITE_URL: sanitizeString(z.string().url()),
					},
					runtimeEnv: {
						DATABASE_URL: "postgresql://test",
						NODE_ENV: "test",
						NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
					},
				};

				expect(testSchema.server.DATABASE_URL).toBeDefined();
				expect(testSchema.client.NEXT_PUBLIC_SITE_URL).toBeDefined();
			}).not.toThrow();
		});

		it("should handle string sanitization", () => {
			const sanitizeString = (schema: z.ZodString) =>
				schema.transform((val) => val.trim().replace(/\0/g, ""));

			const testSchema = sanitizeString(z.string().min(1));
			const result = testSchema.parse("  test\0value  ");

			expect(result).toBe("testvalue");
		});

		it("should validate URL strings", () => {
			const sanitizeString = (schema: z.ZodString) =>
				schema.transform((val) => val.trim().replace(/\0/g, ""));

			const urlSchema = sanitizeString(z.string().url());

			expect(() => urlSchema.parse("https://example.com")).not.toThrow();
			expect(() => urlSchema.parse("not-a-url")).toThrow();
		});

		it("should handle optional values", () => {
			const sanitizeString = (schema: z.ZodString) =>
				schema.transform((val) => val.trim().replace(/\0/g, ""));

			const optionalSchema = sanitizeString(z.string().min(1)).optional();

			expect(optionalSchema.parse(undefined)).toBeUndefined();
			expect(optionalSchema.parse("test")).toBe("test");
		});

		it("should validate environment variable types", () => {
			const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

			expect(nodeEnvSchema.parse("development")).toBe("development");
			expect(nodeEnvSchema.parse("test")).toBe("test");
			expect(nodeEnvSchema.parse("production")).toBe("production");
			expect(nodeEnvSchema.parse(undefined)).toBe("development");
		});
	});

	describe("Production Environment", () => {
		it("should work with production configuration", () => {
			// Test that our schema works in production settings
			const prodEnv = {
				DATABASE_URL: "postgresql://prod.example.com/db",
				NODE_ENV: "production",
				SUPABASE_SERVICE_ROLE_KEY: "prod-key-123",
				NEXT_PUBLIC_SITE_URL: "https://app.example.com",
				NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
				NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-456",
			};

			expect(() => {
				const sanitizeString = (schema: z.ZodString) =>
					schema.transform((val) => val.trim().replace(/\0/g, ""));

				const testConfig = {
					server: {
						DATABASE_URL: sanitizeString(z.string().url()),
						NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
						SUPABASE_SERVICE_ROLE_KEY: sanitizeString(z.string().min(1)),
					},
					client: {
						NEXT_PUBLIC_SITE_URL: sanitizeString(z.string().url()),
						NEXT_PUBLIC_SUPABASE_URL: sanitizeString(z.string().url()),
						NEXT_PUBLIC_SUPABASE_ANON_KEY: sanitizeString(z.string().min(1)),
					},
					runtimeEnv: prodEnv,
				};

				// Validate individual schemas
				expect(testConfig.server.DATABASE_URL.parse(prodEnv.DATABASE_URL)).toBe(
					prodEnv.DATABASE_URL
				);
				expect(testConfig.server.NODE_ENV.parse(prodEnv.NODE_ENV)).toBe("production");
				expect(testConfig.client.NEXT_PUBLIC_SITE_URL.parse(prodEnv.NEXT_PUBLIC_SITE_URL)).toBe(
					prodEnv.NEXT_PUBLIC_SITE_URL
				);
			}).not.toThrow();
		});
	});
});
