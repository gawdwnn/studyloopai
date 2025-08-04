#!/usr/bin/env bun

/**
 * Supabase Environment & Policy Manager
 *
 * A CLI tool to manage Supabase environments, RLS policies, and database operations.
 * It supports both interactive and direct command execution.
 *
 * Built on: Bun + Supabase CLI + PostgreSQL etc
 *
 * @example
 * ```bash
 * # Interactive mode (shows a menu of options)
 * bun scripts/supabase-manager.ts
 *
 * # Show current status
 * bun scripts/supabase-manager.ts status
 *
 * # Switch to an environment
 * bun scripts/supabase-manager.ts switch --env prod
 *
 * # Run operations directly on an environment
 * bun scripts/supabase-manager.ts dev migrate
 * bun scripts/supabase-manager.ts dev reset-dev-database
 * bun scripts/supabase-manager.ts prod migrate --force
 *
 * # Manage policies
 * bun scripts/supabase-manager.ts policies --apply # Applies all policies
 * bun scripts/supabase-manager.ts policies --apply courses_rls.sql # Applies a single file
 * bun scripts/supabase-manager.ts policies --validate # Validates RLS coverage
 * ```
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { env } from "@/env";
import { databaseUrl } from "@/lib/database/db";
import { Separator, confirm, select } from "@inquirer/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { execa } from "execa";
import { Listr } from "listr2";
import pMap from "p-map";
import postgres from "postgres";

// Types
type ProjectKey = "dev" | "prod";
type DatabaseClient = postgres.Sql;
type UIMode = "interactive" | "cli" | "silent";

interface OutputHandler {
	info: (message: string, ...args: unknown[]) => void;
	warn: (message: string, ...args: unknown[]) => void;
	error: (message: string, ...args: unknown[]) => void;
	success: (message: string, ...args: unknown[]) => void;
	prompt: <T>(fn: () => Promise<T>) => Promise<T>;
}

interface DatabaseHandler {
	getPool: (key: ProjectKey) => postgres.Sql;
	withConnection: <T>(
		key: ProjectKey,
		operation: (client: DatabaseClient) => Promise<T>
	) => Promise<T>;
	cleanup: () => Promise<void>;
}

interface CacheEntry<T> {
	value: T;
	timestamp: number;
}

interface Context {
	mode: UIMode;
	output: OutputHandler;
	db: DatabaseHandler;
	cache: Map<string, CacheEntry<unknown>>;
}

// Context creation
const createOutputHandler = (mode: UIMode): OutputHandler => {
	const shouldLog = mode !== "silent";

	return {
		info: shouldLog
			? (msg, ...args) => console.info(chalk.cyan("ℹ"), msg, ...args)
			: () => {},
		warn: shouldLog
			? (msg, ...args) => console.warn(chalk.yellow("⚠"), msg, ...args)
			: () => {},
		error: (msg, ...args) => console.error(chalk.red("✗"), msg, ...args),
		success: shouldLog
			? (msg, ...args) => console.log(chalk.green("✓"), msg, ...args)
			: () => {},
		prompt: async <T>(fn: () => Promise<T>): Promise<T> => {
			if (mode === "interactive") {
				process.stderr.write("\n");
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
			return fn();
		},
	};
};

const createDatabaseHandler = (): DatabaseHandler => {
	const pools = new Map<ProjectKey, postgres.Sql>();

	return {
		getPool: (key: ProjectKey) => {
			if (!pools.has(key)) {
				const dbUrl = getDatabaseUrl(key);
				pools.set(
					key,
					postgres(dbUrl, {
						max: 5,
						idle_timeout: 30,
						connect_timeout: 10,
					})
				);
			}
			return pools.get(key) as postgres.Sql;
		},

		withConnection: async <T>(
			key: ProjectKey,
			operation: (client: DatabaseClient) => Promise<T>
		): Promise<T> => {
			const pool =
				pools.get(key) ||
				(() => {
					const dbUrl = getDatabaseUrl(key);
					const newPool = postgres(dbUrl, {
						max: 5,
						idle_timeout: 30,
						connect_timeout: 10,
					});
					pools.set(key, newPool);
					return newPool;
				})();

			// Test connection
			await pool`SELECT 1`;
			return operation(pool);
		},

		cleanup: async () => {
			await Promise.all(Array.from(pools.values()).map((pool) => pool.end()));
			pools.clear();
		},
	};
};

const createContext = (mode: UIMode = "cli"): Context => ({
	mode,
	output: createOutputHandler(mode),
	db: createDatabaseHandler(),
	cache: new Map(),
});

interface ProjectConfig {
	ref: string | undefined;
	name: string;
	environment: string;
	color: (text: string) => string;
}

interface RLSStatus {
	schemaname: string;
	tablename: string;
	rls_enabled: boolean;
}

interface PolicyStatus {
	schemaname: string;
	tablename: string;
	policyname: string;
	cmd: string;
	roles: string[];
}

// Configuration
const PROJECTS: Record<ProjectKey, ProjectConfig> = {
	dev: {
		ref: env.SUPABASE_DEV_PROJECT_REF,
		name: "studyloopai-development",
		environment: "development",
		color: chalk.blue,
	},
	prod: {
		ref: env.SUPABASE_PROD_PROJECT_REF,
		name: "studyloopai-production",
		environment: "production",
		color: chalk.red,
	},
};

// Cache utilities
const withCache = async <T>(
	ctx: Context,
	key: string,
	ttlMs: number,
	fn: () => Promise<T>
): Promise<T> => {
	const cached = ctx.cache.get(key) as CacheEntry<T> | undefined;
	if (cached && Date.now() - cached.timestamp < ttlMs) {
		return cached.value;
	}

	const value = await fn();
	ctx.cache.set(key, { value, timestamp: Date.now() });
	return value;
};

// Automated table discovery with caching
const getManagedTables = async (ctx: Context): Promise<string[]> => {
	return withCache(ctx, "managed-tables", 5000, async () => {
		const schemaPath = resolve(join(process.cwd(), "drizzle", "schema.ts"));
		if (!existsSync(schemaPath)) {
			ctx.output.warn(
				"drizzle/schema.ts not found. RLS validation will be skipped."
			);
			return [];
		}
		const schemaContent = readFileSync(schemaPath, "utf-8");
		const tableRegex = /export const \w+ = pgTable\(\s*["']([^"']+)["']/g;
		const tables = new Set<string>();
		const matches = schemaContent.matchAll(tableRegex);
		for (const match of matches) {
			tables.add(match[1]);
		}
		const discoveredTables = Array.from(tables).sort();
		ctx.output.info(
			`Discovered ${discoveredTables.length} tables from schema.ts`
		);
		return discoveredTables;
	});
};

const POLICIES_DIR = resolve(join(process.cwd(), "drizzle", "policies"));

// Functional utilities

// Database operations are now handled by ctx.db.withConnection

// Core functions
const getDatabaseUrl = (projectKey: ProjectKey): string => {
	const project = PROJECTS[projectKey];
	if (!project.ref) {
		throw new Error(`No project reference found for ${project.name}`);
	}

	const currentDevRef = env.SUPABASE_DEV_PROJECT_REF;
	if (!currentDevRef) {
		throw new Error("SUPABASE_DEV_PROJECT_REF missing from environment");
	}

	return databaseUrl.replace(currentDevRef, project.ref);
};

const getCurrentProject = async (ctx: Context): Promise<ProjectKey | null> => {
	return withCache(ctx, "current-project", 10000, async () => {
		try {
			const { stdout } = await execa("bunx", [
				"supabase",
				"projects",
				"list",
				"--output",
				"json",
			]);

			const projects = JSON.parse(stdout);
			const linkedProject = projects.find(
				(p: { linked: boolean; id: string }) => p.linked
			);

			if (!linkedProject) return null;

			if (linkedProject.id === PROJECTS.dev.ref) return "dev";
			if (linkedProject.id === PROJECTS.prod.ref) return "prod";

			return null;
		} catch (error) {
			ctx.output.error("Failed to get current project", error);
			return null;
		}
	});
};

const linkProject = async (
	ctx: Context,
	projectKey: ProjectKey,
	dbPassword: string
): Promise<void> => {
	const project = PROJECTS[projectKey];
	if (!project.ref) {
		throw new Error(`No project reference for ${project.name}`);
	}

	await execa("bunx", [
		"supabase",
		"link",
		"--project-ref",
		project.ref,
		"--password",
		dbPassword,
	]);

	// Clear project cache since we just changed it
	ctx.cache.delete("current-project");
	ctx.output.success(`Successfully linked to ${project.name}`);
};

const unlinkProject = async (ctx: Context): Promise<void> => {
	await execa("bunx", ["supabase", "unlink"]);
	ctx.cache.delete("current-project");
	ctx.output.success("Successfully unlinked project");
};

// Policy management functions

const getPolicyFiles = async (ctx: Context): Promise<string[]> => {
	return withCache(ctx, "policy-files", 30000, async () => {
		if (!existsSync(POLICIES_DIR)) {
			ctx.output.warn("Policies directory not found", { dir: POLICIES_DIR });
			return [];
		}

		const files = readdirSync(POLICIES_DIR)
			.filter(
				(file) => file.endsWith(".sql") && /^[a-zA-Z0-9_-]+\.sql$/.test(file)
			)
			.sort();

		ctx.output.info(`Found ${files.length} policy files`);
		return files;
	});
};

const checkRLSStatus = async (
	client: DatabaseClient,
	managedTables: string[]
) => {
	if (managedTables.length === 0) return { rlsStatus: [], policies: [] };
	const [rlsStatus, policies] = await Promise.all([
		client<RLSStatus[]>`
      SELECT 
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables 
      WHERE tablename = ANY(${managedTables})
      AND schemaname = 'public'
      ORDER BY tablename
    `,
		client<PolicyStatus[]>`
      SELECT 
        schemaname,
        tablename,
        policyname,
        cmd,
        roles
      FROM pg_policies 
      WHERE tablename = ANY(${managedTables})
      ORDER BY tablename, policyname
    `,
	]);

	return { rlsStatus, policies };
};

const applyPolicyFile = async (
	ctx: Context,
	client: DatabaseClient,
	filename: string
): Promise<{ status: "success" | "warning" | "error"; message?: string }> => {
	const filePath = join(POLICIES_DIR, filename);
	const sql = readFileSync(filePath, "utf8");

	try {
		await client.unsafe(sql);
		ctx.output.info(`Applied policy file: ${filename}`);
		return { status: "success" };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		// Handle specific PostgreSQL error types
		if (error instanceof Error && "code" in error) {
			const pgError = error as Error & { code: string };

			switch (pgError.code) {
				case "42710": // duplicate_object - policy already exists
					ctx.output.warn(`Policy in ${filename} already exists - skipping`);
					return { status: "warning", message: "Policy already exists" };

				case "42P01": // undefined_table - table does not exist
					ctx.output.warn(
						`Table referenced in ${filename} does not exist - skipping`
					);
					return { status: "warning", message: "Table does not exist" };

				case "42501": {
					// insufficient_privilege
					const permError = `Permission denied: Cannot apply policy from ${filename}. Check database permissions.`;
					ctx.output.error(permError);
					return { status: "error", message: permError };
				}

				default:
					ctx.output.error(
						`Unknown PostgreSQL error code ${pgError.code} for ${filename}: ${errorMessage}`
					);
			}
		}

		// Fallback to message-based detection for non-PostgreSQL errors
		if (errorMessage.includes("already exists")) {
			ctx.output.warn(`Policy in ${filename} already exists - skipping`);
			return { status: "warning", message: "Policy already exists" };
		}

		// Return error for unexpected errors
		ctx.output.error(
			`Failed to apply policy file ${filename}: ${errorMessage}`
		);
		return { status: "error", message: errorMessage };
	}
};

const runCommand = async (
	ctx: Context,
	command: string,
	args: string[],
	description: string
): Promise<string> => {
	ctx.output.info(`Running: ${description}`);
	const { stdout } = await execa(command, args);
	ctx.output.success(`Completed: ${description}`);
	return stdout;
};

// Interactive operations
const getEnvironmentOperations = (projectKey: ProjectKey) => {
	const safeOps = [
		{ name: "Generate migrations", value: "generate" },
		{ name: "Validate RLS coverage", value: "validate-rls" },
	];

	const destructiveOps = [
		{ name: chalk.yellow("Apply migrations"), value: "migrate" },
		{ name: chalk.yellow("Apply single policy file"), value: "apply-policy" },
		{ name: chalk.yellow("Apply all RLS policies"), value: "apply-policies" },
	];

	if (projectKey === "dev") {
		destructiveOps.push({
			name: chalk.red("Reset development database (Truncate)"),
			value: "reset-dev-database",
		});
	}

	return [
		new Separator(chalk.green("--- SAFE Operations ---")),
		...safeOps,
		new Separator(chalk.red("--- DESTRUCTIVE Operations ---")),
		...destructiveOps,
	];
};

const confirmProductionOperation = async (
	ctx: Context,
	operation: string
): Promise<boolean> => {
	ctx.output.info(chalk.red.bold("\n🚨 PRODUCTION ENVIRONMENT"));
	ctx.output.info(chalk.yellow(`You are about to ${operation} on PRODUCTION.`));
	ctx.output.info(
		chalk.gray("This operation may affect live users and data.\n")
	);

	const finalConfirm = await ctx.output.prompt(() =>
		confirm({
			message: "Are you sure you want to continue?",
			default: false,
		})
	);

	return finalConfirm;
};

// Main execution functions
const executeOperation = async (
	ctx: Context,
	projectKey: ProjectKey,
	operation: string,
	targetFile?: string
): Promise<void> => {
	const isProduction = projectKey === "prod";

	const destructiveOps = [
		"migrate",
		"apply-policy",
		"apply-policies",
		"reset-dev-database",
	];

	if (isProduction && destructiveOps.includes(operation)) {
		const confirmed = await confirmProductionOperation(ctx, operation);
		if (!confirmed) return;
	}

	switch (operation) {
		case "generate": {
			const tasks = new Listr([
				{
					title: "Generating migrations",
					task: () =>
						runCommand(
							ctx,
							"bun",
							["run", "db:generate"],
							"Generating migrations"
						),
				},
			]);
			await tasks.run();
			break;
		}

		case "validate-rls": {
			const tasks = new Listr([
				{
					title: "Validating RLS coverage",
					task: async () => {
						await ctx.db.withConnection(projectKey, async (client) => {
							const managedTables = await getManagedTables(ctx);
							const { rlsStatus } = await checkRLSStatus(client, managedTables);

							const missingRLS = managedTables.filter(
								(table) =>
									!rlsStatus.some(
										(status) => status.tablename === table && status.rls_enabled
									)
							);

							if (missingRLS.length === 0) {
								ctx.output.success(
									chalk.green(
										`All ${managedTables.length} discovered tables have RLS enabled`
									)
								);
							} else {
								ctx.output.error(
									chalk.red(
										`${missingRLS.length} of ${managedTables.length} tables are missing RLS:`
									)
								);
								for (const table of missingRLS) {
									ctx.output.error(`   - ${table}`);
								}
							}
						});
					},
				},
			]);
			await tasks.run();
			break;
		}

		case "migrate": {
			const tasks = new Listr([
				{
					title: "Applying migrations",
					task: () =>
						runCommand(
							ctx,
							"bun",
							["run", "db:migrate"],
							"Applying migrations"
						),
				},
			]);
			await tasks.run();
			break;
		}

		case "apply-policy": {
			try {
				const policyFiles = await getPolicyFiles(ctx);
				const fileToApply =
					targetFile ??
					(await ctx.output.prompt(() =>
						select({
							message: "Select policy file to apply:",
							choices: policyFiles.map((file) => ({ name: file, value: file })),
						})
					));

				if (!fileToApply) {
					ctx.output.warn("No policy file selected or specified.");
					return;
				}

				const tasks = new Listr([
					{
						title: `Applying policy file: ${fileToApply}`,
						task: async () => {
							await ctx.db.withConnection(projectKey, async (client) => {
								const result = await applyPolicyFile(ctx, client, fileToApply);
								if (result.status === "success") {
									ctx.output.success(
										chalk.green(
											`Policy file ${fileToApply} applied successfully`
										)
									);
								} else if (result.status === "warning") {
									// Warning message already displayed in applyPolicyFile
								} else {
									throw new Error(result.message || "Failed to apply policy");
								}
							});
						},
					},
				]);
				await tasks.run();
			} catch {
				ctx.output.warn("Operation cancelled by user.");
			}
			break;
		}

		case "apply-policies": {
			const files = await getPolicyFiles(ctx);
			if (files.length === 0) {
				ctx.output.warn("No policy files found");
				return;
			}

			let successCount = 0;
			let warningCount = 0;
			let errorCount = 0;

			const tasks = new Listr([
				{
					title: `Processing ${files.length} policy files (parallel)`,
					task: () =>
						ctx.db.withConnection(projectKey, async (client) => {
							await pMap(
								files,
								async (file) => {
									const result = await applyPolicyFile(ctx, client, file);

									if (result.status === "success") {
										successCount++;
									} else if (result.status === "warning") {
										warningCount++;
									} else {
										errorCount++;
										ctx.output.error(
											`Failed to apply ${file}:`,
											result.message
										);
									}

									return { file, ...result };
								},
								{ concurrency: 3 }
							);
						}),
				},
			]);

			await tasks.run();

			// Summary output
			if (errorCount > 0) {
				ctx.output.error(
					chalk.red(
						`${errorCount} policies failed, ${successCount} succeeded, ${warningCount} skipped`
					)
				);
			} else if (warningCount > 0) {
				ctx.output.warn(
					chalk.yellow(
						`${successCount} policies applied, ${warningCount} already existed (skipped)`
					)
				);
			} else {
				ctx.output.success(
					chalk.green(`All ${successCount} policy files applied successfully`)
				);
			}
			break;
		}

		case "reset-dev-database": {
			if (projectKey !== "dev") {
				ctx.output.error(
					"This operation is only available in dev environment."
				);
				return;
			}

			const confirmed = await ctx.output.prompt(() =>
				confirm({
					message:
						"Are you sure you want to truncate all tables? This will delete ALL data.",
					default: false,
				})
			);

			if (!confirmed) {
				ctx.output.warn("Operation cancelled");
				return;
			}

			const tasks = new Listr([
				{
					title: "Truncating all tables in development database",
					task: () =>
						ctx.db.withConnection(
							projectKey,
							async (client: DatabaseClient) => {
								const tables = await getManagedTables(ctx);
								if (tables.length === 0) {
									ctx.output.warn("No managed tables found to truncate.");
									return;
								}
								const tableList = tables.map((t) => `"${t}"`).join(", ");
								const sql = `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`;

								ctx.output.info(`Executing: ${sql}`);
								await client.unsafe(sql);
							}
						),
				},
			]);

			await tasks.run();
			ctx.output.success(chalk.green("All tables truncated successfully"));
			break;
		}

		default:
			ctx.output.error(chalk.red(`Unknown operation: ${operation}`));
	}
};

// CLI Commands
const program = new Command()
	.name("supabase-manager")
	.description("Supabase environment and policy manager")
	.version("1.0.0");

// Global context - will be initialized based on CLI args
let globalContext: Context;

// Initialize context helper
const initContext = (mode: UIMode = "cli"): Context => {
	if (!globalContext) {
		globalContext = createContext(mode);
	}
	return globalContext;
};

// Status command
program
	.command("status")
	.description("Show current project status")
	.action(async () => {
		const ctx = initContext();
		try {
			const current = await getCurrentProject(ctx);

			ctx.output.info(
				chalk.blue("\n📊 Current Supabase Project Status (Remote)\n")
			);

			if (current) {
				const project = PROJECTS[current];
				ctx.output.info(`Environment: ${project.color(project.environment)}`);
				ctx.output.info(`Project: ${project.name}`);
				ctx.output.info(`Reference: ${project.ref}`);
				ctx.output.success("Remote project linked");

				if (current === "prod") {
					ctx.output.warn("You are in production mode");
				}
			} else {
				ctx.output.warn("No remote project currently linked");
				ctx.output.info(chalk.gray("Use 'switch' command to link a project"));
			}

			ctx.output.info(chalk.blue("\nAvailable Projects:"));
			for (const [key, project] of Object.entries(PROJECTS)) {
				const indicator = current === key ? "●" : "○";
				ctx.output.info(
					`${indicator} ${project.name} (${project.environment})`
				);
			}
		} catch (error) {
			ctx.output.error("Failed to get status", error);
			process.exit(1);
		} finally {
			await ctx.db.cleanup();
		}
	});

// Generic environment linking function
const linkToEnvironment = async (
	ctx: Context,
	targetProject: ProjectKey,
	options: { force?: boolean } = {}
) => {
	const current = await getCurrentProject(ctx);

	if (current === targetProject) {
		ctx.output.success(`Already connected to ${PROJECTS[targetProject].name}`);
		return;
	}

	// Production confirmation if not forced
	if (targetProject === "prod" && !options.force) {
		const confirmed = await confirmProductionOperation(
			ctx,
			"switch to production"
		);
		if (!confirmed) return;
	}

	const dbPassword =
		targetProject === "dev"
			? env.DEV_DATABASE_PASSWORD
			: env.PROD_DATABASE_PASSWORD;

	if (!dbPassword) {
		throw new Error(
			`Database password for ${targetProject} not found in environment variables. Please set DEV_DATABASE_PASSWORD and PROD_DATABASE_PASSWORD.`
		);
	}

	const tasks = new Listr([
		{
			title: `Linking to ${PROJECTS[targetProject].name}`,
			task: () => linkProject(ctx, targetProject, dbPassword),
		},
	]);

	await tasks.run();
	ctx.output.success(`Successfully linked to ${PROJECTS[targetProject].name}`);
};

// Switch command
program
	.command("switch")
	.description("Switch between environments")
	.option("-e, --env <environment>", "Target environment (dev/prod)")
	.action(async (options) => {
		const ctx = initContext();
		try {
			let targetProject: ProjectKey;
			if (options.env && ["dev", "prod"].includes(options.env)) {
				targetProject = options.env as ProjectKey;
			} else {
				targetProject = await ctx.output.prompt(() =>
					select({
						message: "Select target environment:",
						choices: [
							{ name: `${PROJECTS.dev.name} (Development)`, value: "dev" },
							{ name: `${PROJECTS.prod.name} (Production)`, value: "prod" },
						],
					})
				);
			}

			await linkToEnvironment(ctx, targetProject);
		} catch (error) {
			ctx.output.error("Failed to switch project", error);
			process.exit(1);
		} finally {
			await ctx.db.cleanup();
		}
	});

program
	.command("link")
	.description("Link to a Supabase project")
	.option("-e, --env <environment>", "Target environment (dev/prod)")
	.action(async (options) => {
		const ctx = initContext();
		try {
			let targetProject: ProjectKey;
			if (options.env && ["dev", "prod"].includes(options.env)) {
				targetProject = options.env as ProjectKey;
			} else {
				targetProject = await ctx.output.prompt(() =>
					select({
						message: "Select target environment to link:",
						choices: [
							{ name: `${PROJECTS.dev.name} (Development)`, value: "dev" },
							{ name: `${PROJECTS.prod.name} (Production)`, value: "prod" },
						],
					})
				);
			}

			await linkToEnvironment(ctx, targetProject);
		} catch (error) {
			ctx.output.error("Failed to link project", error);
			process.exit(1);
		} finally {
			await ctx.db.cleanup();
		}
	});

// Unlink command
program
	.command("unlink")
	.description("Unlink current project")
	.action(async () => {
		const ctx = initContext();
		try {
			const current = await getCurrentProject(ctx);

			if (!current) {
				ctx.output.warn("No project is currently linked");
				return;
			}

			const project = PROJECTS[current];
			const confirmed = await ctx.output.prompt(() =>
				confirm({
					message: `Are you sure you want to unlink from ${project.color(
						project.name
					)}?`,
					default: false,
				})
			);

			if (!confirmed) {
				ctx.output.warn("Operation cancelled");
				return;
			}

			const tasks = new Listr([
				{
					title: `Unlinking from ${project.name}`,
					task: () => unlinkProject(ctx),
				},
			]);

			await tasks.run();
			ctx.output.success(
				`Successfully unlinked from ${project.color(project.name)}`
			);
		} catch (error) {
			ctx.output.error("Failed to unlink project", error);
			process.exit(1);
		} finally {
			await ctx.db.cleanup();
		}
	});

// Generic environment command handler
const createEnvironmentCommand = (env: ProjectKey) => {
	const envName = env === "dev" ? "development" : "production";
	const envDesc =
		env === "dev" ? "migrations, policies, DB reset" : "migrations, policies";

	return program
		.command(env)
		.description(`Manage the ${envName} environment (${envDesc})`)
		.argument("[operation]", "The operation to run directly")
		.option("--force", "Skip confirmation prompts")
		.action(async (operation, options) => {
			const ctx = initContext();
			try {
				const current = await getCurrentProject(ctx);

				if (current !== env) {
					ctx.output.info(chalk.blue(`🔧 Switching to ${envName} environment`));
					await linkToEnvironment(ctx, env, { force: options.force });
					ctx.output.success(`Linked to ${envName} environment`);
				}

				if (operation) {
					await executeOperation(ctx, env, operation);
				} else {
					const selectedOperation = await ctx.output.prompt(() =>
						select({
							message: `Select ${envName} operation:`,
							choices: getEnvironmentOperations(env),
						})
					);
					await executeOperation(ctx, env, selectedOperation);
				}
			} catch (error) {
				ctx.output.error(`${envName} command failed`, error);
				process.exit(1);
			} finally {
				await ctx.db.cleanup();
			}
		});
};

// Create dev and prod commands
createEnvironmentCommand("dev");
createEnvironmentCommand("prod");

// Policies command
program
	.command("policies")
	.description("Manage RLS policies")
	.option("-a, --apply [file]", "Apply policy file(s)")
	.option("-v, --validate", "Validate RLS coverage")
	.action(async (options) => {
		const ctx = initContext();
		try {
			const projectKey = await getCurrentProject(ctx);
			if (!projectKey) {
				throw new Error("No project linked. Use 'switch' command first.");
			}

			if (options.apply !== undefined) {
				if (typeof options.apply === "string") {
					// Apply a single, specified file
					await executeOperation(
						ctx,
						projectKey,
						"apply-policy",
						options.apply
					);
				} else {
					// Apply all policies
					await executeOperation(ctx, projectKey, "apply-policies");
				}
			} else if (options.validate) {
				await executeOperation(ctx, projectKey, "validate-rls");
			} else {
				program.help();
			}
		} catch (error) {
			ctx.output.error("Policy command failed", error);
			process.exit(1);
		} finally {
			await ctx.db.cleanup();
		}
	});

// Interactive mode (no command)
program.action(async () => {
	const ctx = initContext("interactive");
	try {
		// Don't output anything before the prompt to avoid interference
		await getCurrentProject(ctx);

		const mainOperation = await ctx.output.prompt(() =>
			select({
				message: "What would you like to do?",
				choices: [
					{ name: "Switch environment", value: "switch" },
					{ name: "Show status", value: "status" },
					{ name: "Run development operations", value: "dev" },
					{ name: "Run production operations", value: "prod" },
					{ name: "Unlink current project", value: "unlink" },
					{ name: "Link to a project", value: "link" },
					{ name: "Show help", value: "help" },
					{ name: "Exit", value: "exit" },
				],
			})
		);

		// Execute the selected main operation by calling the appropriate command
		switch (mainOperation) {
			case "switch":
				await program.parseAsync(["switch"], { from: "user" });
				break;
			case "dev":
				await program.parseAsync(["dev"], { from: "user" });
				break;
			case "prod":
				await program.parseAsync(["prod"], { from: "user" });
				break;
			case "status":
				await program.parseAsync(["status"], { from: "user" });
				break;
			case "unlink":
				await program.parseAsync(["unlink"], { from: "user" });
				break;
			case "link":
				await program.parseAsync(["link"], { from: "user" });
				break;
			case "help":
				program.help();
				break;
			case "exit":
				return;
			default:
				ctx.output.error(chalk.red(`Unknown operation: ${mainOperation}`));
		}
	} catch {
		ctx.output.warn("Operation cancelled by user.");
	} finally {
		await ctx.db.cleanup();
	}
});

// Error handling and cleanup
process.on("unhandledRejection", (error) => {
	console.error(chalk.red("✗ Unhandled error"), error);
	if (globalContext) {
		globalContext.db.cleanup().finally(() => process.exit(1));
	} else {
		process.exit(1);
	}
});

process.on("SIGINT", async () => {
	console.info(chalk.yellow("\n👋 Gracefully shutting down..."));
	if (globalContext) {
		await globalContext.db.cleanup();
	}
	process.exit(0);
});

// Parse arguments - this automatically triggers interactive mode if no args
program.parse();
