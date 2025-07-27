import { describe, expect, it } from "bun:test";
import { z } from "zod";

describe("Environment Configuration", () => {
	// Helper function matching your env.ts
	const sanitizeString = (schema: z.ZodString) =>
		schema.transform((val) => val.trim().replace(/\0/g, ""));

	describe("Environment Schema Validation", () => {
		it("should create proper schema structure", () => {
			// Test schema creation without validation
			expect(() => {
				const testSchema = {
					server: {
						DATABASE_URL: sanitizeString(z.string().url()),
						NODE_ENV: z
							.enum(["development", "test", "production"])
							.default("development"),
						SUPABASE_SERVICE_ROLE_KEY: sanitizeString(z.string().min(1)),
						OPENAI_API_KEY: sanitizeString(z.string().min(1)).optional(),
						XAI_API_KEY: sanitizeString(z.string().min(1)).optional(),
					},
					client: {
						NEXT_PUBLIC_SITE_URL: sanitizeString(z.string().url()),
						NEXT_PUBLIC_SUPABASE_URL: sanitizeString(z.string().url()),
						NEXT_PUBLIC_SUPABASE_ANON_KEY: sanitizeString(z.string().min(1)),
					},
				};

				expect(testSchema.server.DATABASE_URL).toBeDefined();
				expect(testSchema.client.NEXT_PUBLIC_SITE_URL).toBeDefined();
			}).not.toThrow();
		});

		it("should handle string sanitization", () => {
			const testSchema = sanitizeString(z.string().min(1));

			// Test various sanitization cases
			expect(testSchema.parse("  test\0value  ")).toBe("testvalue");
			expect(testSchema.parse("  spaces  ")).toBe("spaces");
			expect(testSchema.parse("\0\0test\0\0")).toBe("test");
			expect(testSchema.parse("normal")).toBe("normal");
		});

		it("should validate URL strings", () => {
			const urlSchema = sanitizeString(z.string().url());

			// Valid URLs
			expect(() => urlSchema.parse("https://example.com")).not.toThrow();
			expect(() => urlSchema.parse("http://localhost:3000")).not.toThrow();
			expect(() =>
				urlSchema.parse("postgresql://user:pass@host:5432/db")
			).not.toThrow();

			// Invalid URLs
			expect(() => urlSchema.parse("not-a-url")).toThrow();
			expect(() => urlSchema.parse("")).toThrow();
			expect(() => urlSchema.parse("ftp://example.com")).not.toThrow(); // FTP is valid URL
		});

		it("should handle optional values correctly", () => {
			const optionalSchema = sanitizeString(z.string().min(1)).optional();

			expect(optionalSchema.parse(undefined)).toBeUndefined();
			expect(optionalSchema.parse("test")).toBe("test");
			expect(optionalSchema.parse("  trimmed  ")).toBe("trimmed");

			// Empty string should fail min(1) validation
			expect(() => sanitizeString(z.string().min(1)).parse("")).toThrow();
		});

		it("should validate environment variable types", () => {
			const nodeEnvSchema = z
				.enum(["development", "test", "production"])
				.default("development");

			expect(nodeEnvSchema.parse("development")).toBe("development");
			expect(nodeEnvSchema.parse("test")).toBe("test");
			expect(nodeEnvSchema.parse("production")).toBe("production");
			expect(nodeEnvSchema.parse(undefined)).toBe("development");

			// Invalid values should throw
			expect(() => nodeEnvSchema.parse("staging")).toThrow();
			expect(() => nodeEnvSchema.parse("")).toThrow();
		});
	});

	describe("Database URL Configuration", () => {
		it("should validate DATABASE_URL formats", () => {
			const dbUrlSchema = sanitizeString(z.string().url());

			// Valid database URLs
			const validUrls = [
				"postgresql://user:pass@localhost:5432/mydb",
				"postgres://user:pass@db.example.com/mydb",
				"postgresql://user@localhost/mydb",
				"postgres://localhost/mydb",
				"mysql://user:pass@localhost:3306/mydb",
			];

			for (const url of validUrls) {
				expect(() => dbUrlSchema.parse(url)).not.toThrow();
			}
		});

		it("should reject invalid DATABASE_URL formats", () => {
			const dbUrlSchema = sanitizeString(z.string().url());

			// Invalid database URLs
			const invalidUrls = [
				"just-a-string",
				"://localhost/mydb", // Missing scheme
				"", // Empty string
			];

			for (const url of invalidUrls) {
				expect(() => dbUrlSchema.parse(url)).toThrow();
			}
		});
	});

	describe("Production Environment", () => {
		it("should work with complete production configuration", () => {
			const prodEnv = {
				DATABASE_URL: "postgresql://prod.example.com/db",
				NODE_ENV: "production",
				SUPABASE_SERVICE_ROLE_KEY: "prod-key-123",
				OPENAI_API_KEY: "sk-prod-key",
				XAI_API_KEY: "xai-prod-key",
				UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
				UPSTASH_REDIS_REST_TOKEN: "redis-token",
				TRIGGER_SECRET_KEY: "trigger-secret",
				TRIGGER_PROJECT_ID: "proj_123",
				NEXT_PUBLIC_SITE_URL: "https://app.example.com",
				NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
				NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-456",
			};

			// Create schema matching your env.ts structure
			const serverSchema = z.object({
				DATABASE_URL: sanitizeString(z.string().url()),
				NODE_ENV: z
					.enum(["development", "test", "production"])
					.default("development"),
				SUPABASE_SERVICE_ROLE_KEY: sanitizeString(z.string().min(1)),
				OPENAI_API_KEY: sanitizeString(z.string().min(1)).optional(),
				XAI_API_KEY: sanitizeString(z.string().min(1)).optional(),
				UPSTASH_REDIS_REST_URL: sanitizeString(z.string().url()).optional(),
				UPSTASH_REDIS_REST_TOKEN: sanitizeString(z.string().min(1)).optional(),
				TRIGGER_SECRET_KEY: sanitizeString(z.string().min(1)).optional(),
				TRIGGER_PROJECT_ID: sanitizeString(z.string().min(1)).optional(),
			});

			const clientSchema = z.object({
				NEXT_PUBLIC_SITE_URL: sanitizeString(z.string().url()),
				NEXT_PUBLIC_SUPABASE_URL: sanitizeString(z.string().url()),
				NEXT_PUBLIC_SUPABASE_ANON_KEY: sanitizeString(z.string().min(1)),
			});

			// Should parse without errors
			expect(() => serverSchema.parse(prodEnv)).not.toThrow();
			expect(() => clientSchema.parse(prodEnv)).not.toThrow();
		});

		it("should work with minimal required configuration", () => {
			const minimalEnv = {
				DATABASE_URL: "postgresql://localhost/db",
				NODE_ENV: "development",
				SUPABASE_SERVICE_ROLE_KEY: "key",
				NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
				NEXT_PUBLIC_SUPABASE_URL: "https://local.supabase.co",
				NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
			};

			const serverSchema = z.object({
				DATABASE_URL: sanitizeString(z.string().url()),
				NODE_ENV: z
					.enum(["development", "test", "production"])
					.default("development"),
				SUPABASE_SERVICE_ROLE_KEY: sanitizeString(z.string().min(1)),
				// All optional fields omitted
			});

			expect(() => serverSchema.parse(minimalEnv)).not.toThrow();
		});

		it("should fail when required fields are missing", () => {
			const incompleteEnv = {
				NODE_ENV: "production",
				// Missing DATABASE_URL and other required fields
			};

			const serverSchema = z.object({
				DATABASE_URL: sanitizeString(z.string().url()),
				NODE_ENV: z
					.enum(["development", "test", "production"])
					.default("development"),
				SUPABASE_SERVICE_ROLE_KEY: sanitizeString(z.string().min(1)),
			});

			expect(() => serverSchema.parse(incompleteEnv)).toThrow();
		});
	});

	describe("skipValidation behavior", () => {
		it("should respect SKIP_ENV_VALIDATION flag", () => {
			const shouldSkip = (env: {
				SKIP_ENV_VALIDATION?: string;
				NODE_ENV?: string;
			}) => {
				return !!env.SKIP_ENV_VALIDATION || env.NODE_ENV === undefined;
			};

			expect(shouldSkip({ SKIP_ENV_VALIDATION: "true" })).toBe(true);
			expect(shouldSkip({ SKIP_ENV_VALIDATION: "1" })).toBe(true);
			expect(shouldSkip({ SKIP_ENV_VALIDATION: "" })).toBe(true); // Empty string is truthy in env vars
			expect(shouldSkip({ NODE_ENV: "production" })).toBe(false); // No SKIP_ENV_VALIDATION, NODE_ENV present
			expect(shouldSkip({ NODE_ENV: undefined })).toBe(true); // NODE_ENV undefined triggers skip
		});
	});
});
