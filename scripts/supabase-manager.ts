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
import { Separator, confirm, input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { execa } from "execa";
import { Listr } from "listr2";
import pMap from "p-map";
import pRetry from "p-retry";
import pino from "pino";
import postgres from "postgres";

// Configure logger with the ability to silence it during prompts
const baseLogger = pino(
	{
		transport: {
			target: "pino-pretty",
			options: {
				colorize: true,
				translateTime: "HH:MM:ss",
				ignore: "pid,hostname",
			},
		},
	},
	// Send logs to stderr so they don't interfere with interactive prompts
	pino.destination({ fd: 2, sync: true }) // sync: true ensures immediate flushing
);

// Create a logger wrapper that can be silenced
let loggerSilenced = false;
const logger = new Proxy(baseLogger, {
	get(target, prop) {
		if (
			loggerSilenced &&
			typeof target[prop as keyof typeof target] === "function"
		) {
			// Return no-op function when silenced
			return () => {};
		}
		return target[prop as keyof typeof target];
	},
});

// Types
type ProjectKey = "dev" | "prod";
type DatabaseClient = postgres.Sql;

// Helper function to run interactive prompts without logger interference
async function withSilentLogger<T>(fn: () => Promise<T>): Promise<T> {
	// Ensure we're on a new line
	process.stderr.write("\n");

	// Flush any pending logs with a longer delay
	await new Promise((resolve) => setTimeout(resolve, 200));

	// Silence logger during prompt
	loggerSilenced = true;
	try {
		return await fn();
	} finally {
		// Re-enable logger after prompt
		loggerSilenced = false;
	}
}

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

// Automated table discovery
const getManagedTables = async (): Promise<string[]> => {
	const schemaPath = resolve(join(process.cwd(), "drizzle", "schema.ts"));
	if (!existsSync(schemaPath)) {
		logger.warn("drizzle/schema.ts not found. RLS validation will be skipped.");
		return [];
	}
	const schemaContent = readFileSync(schemaPath, "utf-8");
	const tableRegex =
		/export const \w+ = pgTable\(\s*["\\]'(["\\]'\\]+)\\["\\]'\\]/g;
	const tables = new Set<string>();
	const matches = schemaContent.matchAll(tableRegex);
	for (const match of matches) {
		tables.add(match[1]);
	}
	const discoveredTables = Array.from(tables).sort();
	logger.info(`Discovered ${discoveredTables.length} tables from schema.ts`);
	return discoveredTables;
};

const POLICIES_DIR = resolve(join(process.cwd(), "drizzle", "policies"));

// Functional utilities
const withRetry = <T extends (...args: unknown[]) => Promise<unknown>>(
	fn: T,
	options?: { retries?: number; factor?: number }
): T => {
	return (async (...args: Parameters<T>) => {
		return pRetry(() => fn(...args), {
			retries: options?.retries ?? 3,
			factor: options?.factor ?? 2,
			onFailedAttempt: (error) => {
				logger.warn(
					`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left: ${error.message}`
				);
			},
		});
	}) as T;
};

const withDatabase = async <T>(
	projectKey: ProjectKey,
	operation: (client: DatabaseClient) => Promise<T>
): Promise<T> => {
	const dbUrl = getDatabaseUrl(projectKey);
	const client = postgres(dbUrl, {
		max: 10,
		idle_timeout: 20,
		connect_timeout: 10,
	});

	try {
		// Test connection
		await client`SELECT 1`;
		logger.info(`Connected to ${PROJECTS[projectKey].name} database`);
		return await operation(client);
	} finally {
		await client.end();
		logger.info(`Disconnected from ${PROJECTS[projectKey].name} database`);
	}
};

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

const getCurrentProject = withRetry(async (): Promise<ProjectKey | null> => {
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
		logger.error("Failed to get current project", error);
		return null;
	}
});

const linkProject = async (
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

	logger.info(`Successfully linked to ${project.name}`);
};

const unlinkProject = withRetry(async (): Promise<void> => {
	await execa("bunx", ["supabase", "unlink"]);
	logger.info("Successfully unlinked project");
});

// Policy management functions

const getPolicyFiles = async (): Promise<string[]> => {
	if (!existsSync(POLICIES_DIR)) {
		logger.warn("Policies directory not found", { dir: POLICIES_DIR });
		return [];
	}

	const files = readdirSync(POLICIES_DIR)
		.filter(
			(file) => file.endsWith(".sql") && /^[a-zA-Z0-9_-]+\.sql$/.test(file)
		)
		.sort();

	logger.info(`Found ${files.length} policy files`);
	return files;
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
	client: DatabaseClient,
	filename: string
): Promise<{ status: "success" | "warning" | "error"; message?: string }> => {
	const filePath = join(POLICIES_DIR, filename);
	const sql = readFileSync(filePath, "utf8");

	// Skip SQL validation - PostgreSQL will validate the SQL when executed
	// The previous validation was too restrictive for the variety of SQL in policy files

	try {
		await client.unsafe(sql);
		logger.info(`Applied policy file: ${filename}`);
		return { status: "success" };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		// Log the actual error for debugging
		logger.warn(`Policy application error for ${filename}: ${errorMessage}`);

		// Handle specific PostgreSQL error types
		if (error instanceof Error && "code" in error) {
			const pgError = error as Error & { code: string };

			switch (pgError.code) {
				case "42710": // duplicate_object - policy already exists
					logger.warn(`⚠️  Policy in ${filename} already exists - skipping`);
					return { status: "warning", message: "Policy already exists" };

				case "42P01": // undefined_table - table does not exist
					logger.warn(
						`⚠️  Table referenced in ${filename} does not exist - skipping`
					);
					return { status: "warning", message: "Table does not exist" };

				case "42501": {
					// insufficient_privilege
					const permError = `Permission denied: Cannot apply policy from ${filename}. Check database permissions.`;
					logger.error(permError);
					return { status: "error", message: permError };
				}

				default:
					// Log unknown PostgreSQL error codes for future handling
					logger.error(
						`Unknown PostgreSQL error code ${pgError.code} for ${filename}: ${errorMessage}`
					);
			}
		}

		// Fallback to message-based detection for non-PostgreSQL errors
		if (errorMessage.includes("already exists")) {
			logger.warn(`⚠️  Policy in ${filename} already exists - skipping`);
			return { status: "warning", message: "Policy already exists" };
		}

		// Return error for unexpected errors
		logger.error(`Failed to apply policy file ${filename}: ${errorMessage}`);
		return { status: "error", message: errorMessage };
	}
};

const runCommand = async (
	command: string,
	args: string[],
	description: string
): Promise<string> => {
	logger.info(`Running: ${description}`);
	const { stdout } = await execa(command, args);
	logger.info(`Completed: ${description}`);
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
	operation: string
): Promise<boolean> => {
	logger.info(chalk.red.bold("\n🚨 PRODUCTION ENVIRONMENT"));
	logger.info(chalk.yellow(`You are about to ${operation} on PRODUCTION.`));
	logger.info(chalk.gray("This operation may affect live users and data.\n"));

	const confirmation = await withSilentLogger(() =>
		input({
			message: `Type "PRODUCTION" to confirm ${operation}:`,
		})
	);

	if (confirmation !== "PRODUCTION") {
		logger.warn("Operation cancelled - confirmation text did not match");
		return false;
	}

	const finalConfirm = await withSilentLogger(() =>
		confirm({
			message: "Are you absolutely sure you want to continue?",
			default: false,
		})
	);

	return finalConfirm;
};

// Main execution functions
const executeOperation = async (
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
		const confirmed = await confirmProductionOperation(operation);
		if (!confirmed) return;
	}

	switch (operation) {
		case "generate": {
			const tasks = new Listr([
				{
					title: "Generating migrations",
					task: () =>
						runCommand("bun", ["run", "db:generate"], "Generating migrations"),
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
						await withDatabase(projectKey, async (client) => {
							const managedTables = await getManagedTables();
							const { rlsStatus } = await checkRLSStatus(client, managedTables);

							const missingRLS = managedTables.filter(
								(table) =>
									!rlsStatus.some(
										(status) => status.tablename === table && status.rls_enabled
									)
							);

							if (missingRLS.length === 0) {
								logger.info(
									chalk.green(
										`\n✅ All ${managedTables.length} discovered tables have RLS enabled`
									)
								);
							} else {
								logger.error(
									chalk.red(
										`\n❌ ${missingRLS.length} of ${managedTables.length} tables are missing RLS:`
									)
								);
								for (const table of missingRLS) {
									logger.error(`   - ${table}`);
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
						runCommand("bun", ["run", "db:migrate"], "Applying migrations"),
				},
			]);
			await tasks.run();
			break;
		}

		case "apply-policy": {
			try {
				const policyFiles = await getPolicyFiles();
				const fileToApply =
					targetFile ??
					(await withSilentLogger(() =>
						select({
							message: "Select policy file to apply:",
							choices: policyFiles.map((file) => ({ name: file, value: file })),
						})
					));

				if (!fileToApply) {
					logger.warn("No policy file selected or specified.");
					return;
				}

				const tasks = new Listr([
					{
						title: `Applying policy file: ${fileToApply}`,
						task: async () => {
							await withDatabase(projectKey, async (client) => {
								const result = await applyPolicyFile(client, fileToApply);
								if (result.status === "success") {
									logger.info(
										chalk.green(
											`✅ Policy file ${fileToApply} applied successfully`
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
				logger.warn("Operation cancelled by user.");
			}
			break;
		}

		case "apply-policies": {
			const files = await getPolicyFiles();
			if (files.length === 0) {
				logger.warn("No policy files found");
				return;
			}

			let successCount = 0;
			let warningCount = 0;
			let errorCount = 0;

			const tasks = new Listr([
				{
					title: `Processing ${files.length} policy files`,
					task: () =>
						withDatabase(projectKey, async (client) => {
							await pMap(
								files,
								async (file) => {
									const result = await applyPolicyFile(client, file);

									if (result.status === "success") {
										successCount++;
									} else if (result.status === "warning") {
										warningCount++;
									} else {
										errorCount++;
										logger.error(`Failed to apply ${file}:`, result.message);
									}

									return { file, ...result };
								},
								{ concurrency: 1 }
							);
						}),
				},
			]);

			await tasks.run();

			// Summary output
			if (errorCount > 0) {
				logger.error(
					chalk.red(
						`❌ ${errorCount} policies failed, ${successCount} succeeded, ${warningCount} skipped`
					)
				);
			} else if (warningCount > 0) {
				logger.warn(
					chalk.yellow(
						`⚠️  ${successCount} policies applied, ${warningCount} already existed (skipped)`
					)
				);
			} else {
				logger.info(
					chalk.green(
						`✅ All ${successCount} policy files applied successfully`
					)
				);
			}
			break;
		}

		case "reset-dev-database": {
			if (projectKey !== "dev") {
				logger.error("This operation is only available in dev environment.");
				return;
			}

			const confirmed = await withSilentLogger(() =>
				confirm({
					message:
						"Are you sure you want to truncate all tables? This will delete ALL data.",
					default: false,
				})
			);

			if (!confirmed) {
				logger.warn("Operation cancelled");
				return;
			}

			const tasks = new Listr([
				{
					title: "Truncating all tables in development database",
					task: () =>
						withDatabase(projectKey, async (client: DatabaseClient) => {
							const tables = await getManagedTables();
							if (tables.length === 0) {
								logger.warn("No managed tables found to truncate.");
								return;
							}
							const tableList = tables.map((t) => `"${t}"`).join(", ");
							const sql = `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`;

							logger.info(`Executing: ${sql}`);
							await client.unsafe(sql);
						}),
				},
			]);

			await tasks.run();
			logger.info(chalk.green("✅ All tables truncated successfully"));
			break;
		}

		default:
			logger.error(chalk.red(`Unknown operation: ${operation}`));
	}
};

// CLI Commands
const program = new Command()
	.name("supabase-manager")
	.description("Supabase environment and policy manager")
	.version("1.0.0");

// Status command
program
	.command("status")
	.description("Show current project status")
	.action(async () => {
		try {
			const current = await getCurrentProject();

			logger.info(
				chalk.blue("\n📊 Current Supabase Project Status (Remote)\n")
			);

			if (current) {
				const project = PROJECTS[current];
				logger.info(`Environment: ${project.color(project.environment)}`);
				logger.info(`Project: ${project.name}`);
				logger.info(`Reference: ${project.ref}`);
				logger.info(chalk.green("✓ Remote project linked"));

				if (current === "prod") {
					logger.warn("⚠️  You are in production mode");
				}
			} else {
				logger.warn("No remote project currently linked");
				logger.info(chalk.gray("Use 'switch' command to link a project"));
			}

			logger.info(chalk.blue("\nAvailable Projects:"));
			for (const [key, project] of Object.entries(PROJECTS)) {
				const indicator = current === key ? "●" : "○";
				logger.info(`${indicator} ${project.name} (${project.environment})`);
			}
		} catch (error) {
			logger.error("Failed to get status", error);
			process.exit(1);
		}
	});

// Switch command
program
	.command("switch")
	.description("Switch between environments")
	.option("-e, --env <environment>", "Target environment (dev/prod)")
	.action(async (options) => {
		try {
			const current = await getCurrentProject();

			let targetProject: ProjectKey;
			if (options.env && ["dev", "prod"].includes(options.env)) {
				targetProject = options.env as ProjectKey;
			} else {
				targetProject = await withSilentLogger(() =>
					select({
						message: "Select target environment:",
						choices: [
							{ name: `${PROJECTS.dev.name} (Development)`, value: "dev" },
							{ name: `${PROJECTS.prod.name} (Production)`, value: "prod" },
						],
					})
				);
			}

			if (current === targetProject) {
				logger.info(
					chalk.green(`✓ Already connected to ${PROJECTS[targetProject].name}`)
				);
				return;
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
					task: () => linkProject(targetProject, dbPassword),
				},
			]);

			await tasks.run();
			logger.info(
				chalk.green(`✅ Successfully linked to ${PROJECTS[targetProject].name}`)
			);
		} catch (error) {
			logger.error("Failed to switch project", error);
			process.exit(1);
		}
	});

program
	.command("link")
	.description("Link to a Supabase project")
	.option("-e, --env <environment>", "Target environment (dev/prod)")
	.action(async (options) => {
		try {
			const current = await getCurrentProject();

			let targetProject: ProjectKey;
			if (options.env && ["dev", "prod"].includes(options.env)) {
				targetProject = options.env as ProjectKey;
			} else {
				targetProject = await withSilentLogger(() =>
					select({
						message: "Select target environment to link:",
						choices: [
							{ name: `${PROJECTS.dev.name} (Development)`, value: "dev" },
							{ name: `${PROJECTS.prod.name} (Production)`, value: "prod" },
						],
					})
				);
			}

			if (current === targetProject) {
				logger.info(
					chalk.green(`✓ Already connected to ${PROJECTS[targetProject].name}`)
				);
				return;
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
					task: () => linkProject(targetProject, dbPassword),
				},
			]);

			await tasks.run();
			logger.info(
				chalk.green(`✅ Successfully linked to ${PROJECTS[targetProject].name}`)
			);
		} catch (error) {
			logger.error("Failed to link project", error);
			process.exit(1);
		}
	});

// Unlink command
program
	.command("unlink")
	.description("Unlink current project")
	.action(async () => {
		try {
			const current = await getCurrentProject();

			if (!current) {
				logger.warn("No project is currently linked");
				return;
			}

			const project = PROJECTS[current];
			const confirmed = await withSilentLogger(() =>
				confirm({
					message: `Are you sure you want to unlink from ${project.color(
						project.name
					)}?`,
					default: false,
				})
			);

			if (!confirmed) {
				logger.warn("Operation cancelled");
				return;
			}

			const tasks = new Listr([
				{
					title: `Unlinking from ${project.name}`,
					task: () => unlinkProject(),
				},
			]);

			await tasks.run();
			logger.info(
				chalk.green(
					`✅ Successfully unlinked from ${project.color(project.name)}`
				)
			);
		} catch (error) {
			logger.error("Failed to unlink project", error);
			process.exit(1);
		}
	});

// Dev command
program
	.command("dev")
	.description(
		"Manage the development environment (migrations, policies, DB reset)"
	)
	.argument("[operation]", "The operation to run directly")
	.action(async (operation) => {
		try {
			const current = await getCurrentProject();

			if (current !== "dev") {
				logger.info(chalk.blue("🔧 Switching to Development Environment"));

				const dbPassword = env.DEV_DATABASE_PASSWORD;
				if (!dbPassword) {
					throw new Error(
						"DEV_DATABASE_PASSWORD not found in environment variables."
					);
				}
				await linkProject("dev", dbPassword);
				logger.info(chalk.green("✅ Linked to development environment"));
			}

			if (operation) {
				await executeOperation("dev", operation);
			} else {
				const selectedOperation = await withSilentLogger(() =>
					select({
						message: "Select development operation:",
						choices: getEnvironmentOperations("dev"),
					})
				);
				await executeOperation("dev", selectedOperation);
			}
		} catch (error) {
			logger.error("Development command failed", error);
			process.exit(1);
		}
	});

// Prod command
program
	.command("prod")
	.description("Manage the production environment (migrations, policies)")
	.argument("[operation]", "The operation to run directly")
	.option("--force", "Skip confirmation prompts for direct operations")
	.action(async (operation, options) => {
		try {
			const current = await getCurrentProject();

			if (current !== "prod") {
				if (!options.force) {
					const confirmed = await confirmProductionOperation(
						"switch to production"
					);
					if (!confirmed) return;
				}

				const dbPassword = env.PROD_DATABASE_PASSWORD;
				if (!dbPassword) {
					throw new Error(
						"PROD_DATABASE_PASSWORD not found in environment variables."
					);
				}
				await linkProject("prod", dbPassword);
				logger.info(chalk.red("✅ Linked to production environment"));
			}

			if (operation) {
				await executeOperation("prod", operation);
			} else {
				const selectedOperation = await withSilentLogger(() =>
					select({
						message: "Select production operation:",
						choices: getEnvironmentOperations("prod"),
					})
				);
				await executeOperation("prod", selectedOperation);
			}
		} catch (error) {
			logger.error("Production command failed", error);
			process.exit(1);
		}
	});

// Policies command
program
	.command("policies")
	.description("Manage RLS policies")
	.option("-a, --apply [file]", "Apply policy file(s)")
	.option("-v, --validate", "Validate RLS coverage")
	.action(async (options) => {
		try {
			const projectKey = await getCurrentProject();
			if (!projectKey) {
				throw new Error("No project linked. Use 'switch' command first.");
			}

			if (options.apply !== undefined) {
				if (typeof options.apply === "string") {
					// Apply a single, specified file
					await executeOperation(projectKey, "apply-policy", options.apply);
				} else {
					// Apply all policies
					await executeOperation(projectKey, "apply-policies");
				}
			} else if (options.validate) {
				await executeOperation(projectKey, "validate-rls");
			} else {
				program.help();
			}
		} catch (error) {
			logger.error("Policy command failed", error);
			process.exit(1);
		}
	});

// Interactive mode (no command)
program.action(async () => {
	try {
		// Don't output anything before the prompt to avoid interference
		await getCurrentProject();

		const mainOperation = await withSilentLogger(() =>
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
				logger.error(chalk.red(`Unknown operation: ${mainOperation}`));
		}
	} catch {
		logger.warn("Operation cancelled by user.");
	}
});

// Error handling
process.on("unhandledRejection", (error) => {
	logger.error("Unhandled error", error);
	process.exit(1);
});

// Parse arguments - this automatically triggers interactive mode if no args
program.parse();
