#!/usr/bin/env bun

/**
 * Supabase Environment & Policy Manager
 *
 * Built on: Bun + Supabase CLI + PostgreSQL etc
 *
 * @example
 * ```bash
 * # Interactive mode
 * bun scripts/supabase-manager.ts
 *
 * # Direct commands
 * bun scripts/supabase-manager.ts dev
 * bun scripts/supabase-manager.ts switch --env prod
 * bun scripts/supabase-manager.ts policies --check
 * bun scripts/supabase-manager.ts policies --apply concept_maps.sql
 * ```
 */

import { env } from "@/env";
import { databaseUrl } from "@/lib/database/db";
import { Separator, confirm, input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { execa } from "execa";
import { Listr } from "listr2";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import pMap from "p-map";
import pRetry from "p-retry";
import pino from "pino";
import postgres from "postgres";

// Configure logger
const logger = pino({
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
			translateTime: "HH:MM:ss",
			ignore: "pid,hostname",
		},
	},
});

// Types
type ProjectKey = "dev" | "prod";
type DatabaseClient = postgres.Sql;

interface ProjectConfig {
	ref: string | undefined;
	name: string;
	environment: string;
	color: (text: string) => string;
}

interface PolicyInfo {
	name: string;
	table: string;
}

interface ParsedPolicyFile {
	policies: PolicyInfo[];
	tables: string[];
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
	const tableRegex = /export const \w+ = pgTable\(\s*["']([^"]+)["']/g;
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
const parsePolicyFile = (sqlContent: string): ParsedPolicyFile => {
	const policies: PolicyInfo[] = [];
	const tables = new Set<string>();

	// Extract table names from CREATE POLICY statements
	const policyRegex = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+"?(\w+)"?/gi;
	let match: RegExpExecArray | null;

	match = policyRegex.exec(sqlContent);
	while (match !== null) {
		policies.push({
			name: match[1],
			table: match[2],
		});
		tables.add(match[2]);
		match = policyRegex.exec(sqlContent);
	}

	// Extract table names from ALTER TABLE statements
	const alterRegex =
		/ALTER\s+TABLE\s+"?(\w+)"?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
	match = alterRegex.exec(sqlContent);
	while (match !== null) {
		tables.add(match[1]);
		match = alterRegex.exec(sqlContent);
	}

	return {
		policies,
		tables: Array.from(tables),
	};
};

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
					process.stdout.write(
						chalk.yellow(`⚠️  Policy in ${filename} already exists - skipping\n`)
					);
					return { status: "warning", message: "Policy already exists" };

				case "42P01": // undefined_table - table does not exist
					process.stdout.write(
						chalk.yellow(
							`⚠️  Table referenced in ${filename} does not exist - skipping\n`
						)
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
			process.stdout.write(
				chalk.yellow(`⚠️  Policy in ${filename} already exists - skipping\n`)
			);
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
const getEnvironmentOperations = () => {
	const safeOps = [
		{ name: "Generate migrations", value: "generate" },
		{ name: "Check RLS policies", value: "policies" },
		{ name: "List policy files", value: "list-policies" },
		{ name: "Validate RLS coverage", value: "validate-rls" },
		{ name: "View recent logs", value: "logs" },
	];

	const destructiveOps = [
		{ name: chalk.yellow("Apply migrations"), value: "migrate" },
		{ name: chalk.yellow("Apply single policy file"), value: "apply-policy" },
		{ name: chalk.yellow("Apply all RLS policies"), value: "apply-policies" },
		{ name: chalk.yellow("Run complete setup"), value: "setup" },
	];

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
	process.stdout.write(chalk.red.bold("\n🚨 PRODUCTION ENVIRONMENT\n"));
	process.stdout.write(
		chalk.yellow(`You are about to ${operation} on PRODUCTION.\n`)
	);
	process.stdout.write(
		chalk.gray("This operation may affect live users and data.\n\n")
	);

	const confirmation = await input({
		message: `Type "PRODUCTION" to confirm ${operation}:`,
	});

	if (confirmation !== "PRODUCTION") {
		process.stdout.write(
			chalk.yellow("Operation cancelled - confirmation text did not match\n")
		);
		return false;
	}

	const finalConfirm = await confirm({
		message: "Are you absolutely sure you want to continue?",
		default: false,
	});

	return finalConfirm;
};

// Main execution functions
const executeOperation = async (
	projectKey: ProjectKey,
	operation: string
): Promise<void> => {
	const isProduction = projectKey === "prod";

	const destructiveOps = ["migrate", "apply-policy", "apply-policies", "setup"];

	if (isProduction && destructiveOps.includes(operation)) {
		const confirmed = await confirmProductionOperation(operation);
		if (!confirmed) return;
	}

	switch (operation) {
		case "generate": {
			await runCommand("bun", ["run", "db:generate"], "Generating migrations");
			break;
		}

		case "policies": {
			await withDatabase(projectKey, async (client) => {
				const managedTables = await getManagedTables();
				const { rlsStatus, policies } = await checkRLSStatus(
					client,
					managedTables
				);

				process.stdout.write(chalk.blue("\n📋 RLS Status:\n"));
				for (const table of rlsStatus) {
					const status = table.rls_enabled
						? chalk.green("✅ Enabled")
						: chalk.red("❌ Disabled");
					process.stdout.write(`   ${table.tablename}: ${status}\n`);
				}

				const policyByTable: Record<string, PolicyStatus[]> = {};
				for (const policy of policies) {
					if (!policyByTable[policy.tablename]) {
						policyByTable[policy.tablename] = [];
					}
					policyByTable[policy.tablename].push(policy);
				}

				process.stdout.write(chalk.blue("\n🔐 Current Policies:\n"));
				for (const [table, tablePolicies] of Object.entries(policyByTable)) {
					process.stdout.write(chalk.cyan(`\n   ${table}:\n`));
					for (const policy of tablePolicies) {
						process.stdout.write(
							chalk.gray(`     - ${policy.policyname} (${policy.cmd})\n`)
						);
					}
				}
			});
			break;
		}

		case "list-policies": {
			const files = await getPolicyFiles();
			process.stdout.write(chalk.blue("\n📁 Available Policy Files:\n"));

			for (const file of files) {
				const filePath = join(POLICIES_DIR, file);
				const content = readFileSync(filePath, "utf8");
				const parsed = parsePolicyFile(content);

				process.stdout.write(`   ${file}:\n`);
				process.stdout.write(
					chalk.gray(`     • ${parsed.policies.length} policies\n`)
				);
				process.stdout.write(
					chalk.gray(
						`     • ${parsed.tables.length} tables: ${parsed.tables.join(", ")}\n`
					)
				);
			}
			break;
		}

		case "validate-rls": {
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
					process.stdout.write(
						chalk.green(
							`\n✅ All ${managedTables.length} discovered tables have RLS enabled\n`
						)
					);
				} else {
					process.stdout.write(
						chalk.red(
							`\n❌ ${missingRLS.length} of ${managedTables.length} tables are missing RLS:\n`
						)
					);
					for (const table of missingRLS) {
						process.stdout.write(`   - ${table}\n`);
					}
				}
			});
			break;
		}

		case "logs": {
			process.stdout.write(chalk.blue("\n📋 Recent Logs:\n\n"));

			// Get logs from different services
			const services = ["api", "postgres", "auth"] as const;

			for (const service of services) {
				try {
					process.stdout.write(
						chalk.cyan(`--- ${service.toUpperCase()} Service ---\n`)
					);

					// This would use MCP Supabase tools in a real implementation
					// For now, show a placeholder
					process.stdout.write(
						chalk.gray(`Logs for ${service} service would appear here\n`)
					);
					process.stdout.write(
						chalk.gray("(Requires MCP Supabase integration)\n\n")
					);
				} catch (error) {
					process.stdout.write(
						chalk.red(`Failed to fetch ${service} logs: ${error}\n`)
					);
				}
			}
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
			const files = await getPolicyFiles();
			if (files.length === 0) {
				process.stdout.write(chalk.yellow("No policy files found\n"));
				return;
			}

			const selectedFile = await select({
				message: "Select policy file to apply:",
				choices: files.map((file) => ({ name: file, value: file })),
			});

			await withDatabase(projectKey, async (client) => {
				const result = await applyPolicyFile(client, selectedFile);
				if (result.status === "success") {
					process.stdout.write(
						chalk.green(`✅ Policy file ${selectedFile} applied successfully\n`)
					);
				} else if (result.status === "warning") {
					// Warning message already displayed in applyPolicyFile
				} else {
					throw new Error(result.message || "Failed to apply policy");
				}
			});
			break;
		}

		case "apply-policies": {
			const files = await getPolicyFiles();
			if (files.length === 0) {
				process.stdout.write(chalk.yellow("No policy files found\n"));
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
							const results = await pMap(
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

							return results;
						}),
				},
			]);

			await tasks.run();

			// Summary output
			if (errorCount > 0) {
				process.stdout.write(
					chalk.red(
						`❌ ${errorCount} policies failed, ${successCount} succeeded, ${warningCount} skipped\n`
					)
				);
			} else if (warningCount > 0) {
				process.stdout.write(
					chalk.yellow(
						`⚠️  ${successCount} policies applied, ${warningCount} already existed (skipped)\n`
					)
				);
			} else {
				process.stdout.write(
					chalk.green(
						`✅ All ${successCount} policy files applied successfully\n`
					)
				);
			}
			break;
		}

		case "setup": {
			const tasks = new Listr([
				{
					title: "Generating migrations",
					task: () =>
						runCommand("bun", ["run", "db:generate"], "Generating migrations"),
				},
				{
					title: "Applying migrations",
					task: () =>
						runCommand("bun", ["run", "db:migrate"], "Applying migrations"),
				},
				{
					title: "Applying all policies",
					task: async () => {
						const files = await getPolicyFiles();
						await withDatabase(projectKey, async (client) => {
							await pMap(
								files,
								async (file) => {
									const result = await applyPolicyFile(client, file);
									if (result.status === "error") {
										logger.error(
											`Setup failed: could not apply ${file}: ${result.message}`
										);
									}
									return result;
								},
								{ concurrency: 1 }
							);
						});
					},
				},
			]);

			await tasks.run();
			process.stdout.write(chalk.green("✅ Setup completed successfully\n"));
			break;
		}

		default:
			process.stdout.write(chalk.red(`Unknown operation: ${operation}\n`));
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

			process.stdout.write(
				chalk.blue("\n📊 Current Supabase Project Status (Remote)\n\n")
			);

			if (current) {
				const project = PROJECTS[current];
				process.stdout.write(
					`Environment: ${project.color(project.environment)}\n`
				);
				process.stdout.write(`Project: ${project.name}\n`);
				process.stdout.write(`Reference: ${project.ref}\n`);
				process.stdout.write(chalk.green("✓ Remote project linked\n"));

				if (current === "prod") {
					process.stdout.write(chalk.yellow("⚠️  You are in production mode\n"));
				}
			} else {
				process.stdout.write(
					chalk.yellow("No remote project currently linked\n")
				);
				process.stdout.write(
					chalk.gray("Use 'switch' command to link a project\n")
				);
			}

			process.stdout.write(chalk.blue("\nAvailable Projects:\n"));
			for (const [key, project] of Object.entries(PROJECTS)) {
				const indicator = current === key ? "●" : "○";
				process.stdout.write(
					`${indicator} ${project.name} (${project.environment})\n`
				);
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
				targetProject = await select({
					message: "Select target environment:",
					choices: [
						{ name: `${PROJECTS.dev.name} (Development)`, value: "dev" },
						{ name: `${PROJECTS.prod.name} (Production)`, value: "prod" },
					],
				});
			}

			if (current === targetProject) {
				process.stdout.write(
					chalk.green(
						`✓ Already connected to ${PROJECTS[targetProject].name}\n`
					)
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
			process.stdout.write(
				chalk.green(
					`✅ Successfully linked to ${PROJECTS[targetProject].name}\n`
				)
			);
		} catch (error) {
			logger.error("Failed to switch project", error);
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
				process.stdout.write(chalk.yellow("No project is currently linked\n"));
				return;
			}

			const project = PROJECTS[current];
			const confirmed = await confirm({
				message: `Are you sure you want to unlink from ${project.color(project.name)}?`,
				default: false,
			});

			if (!confirmed) {
				process.stdout.write(chalk.yellow("Operation cancelled\n"));
				return;
			}

			const tasks = new Listr([
				{
					title: `Unlinking from ${project.name}`,
					task: () => unlinkProject(),
				},
			]);

			await tasks.run();
			process.stdout.write(
				chalk.green(
					`✅ Successfully unlinked from ${project.color(project.name)}\n`
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
	.description("Switch to development and run operations")
	.action(async () => {
		try {
			const current = await getCurrentProject();

			if (current !== "dev") {
				process.stdout.write(
					chalk.blue("🔧 Switching to Development Environment\n")
				);

				const dbPassword = env.DEV_DATABASE_PASSWORD;
				if (!dbPassword) {
					throw new Error(
						"DEV_DATABASE_PASSWORD not found in environment variables."
					);
				}
				await linkProject("dev", dbPassword);
				process.stdout.write(
					chalk.green("✅ Linked to development environment\n")
				);
			}

			const operation = await select({
				message: "Select development operation:",
				choices: getEnvironmentOperations(),
			});

			await executeOperation("dev", operation);
		} catch (error) {
			logger.error("Development command failed", error);
			process.exit(1);
		}
	});

// Prod command
program
	.command("prod")
	.description("Switch to production and run operations")
	.option("--force", "Skip confirmation prompts")
	.action(async (options) => {
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
				process.stdout.write(
					chalk.red("✅ Linked to production environment\n")
				);
			}

			const operation = await select({
				message: "Select production operation:",
				choices: getEnvironmentOperations(),
			});

			await executeOperation("prod", operation);
		} catch (error) {
			logger.error("Production command failed", error);
			process.exit(1);
		}
	});

// Policies command
program
	.command("policies")
	.description("Manage RLS policies")
	.option("-c, --check", "Check current policy status")
	.option("-l, --list", "List available policy files")
	.option("-a, --apply [file]", "Apply policy file(s)")
	.option("-v, --validate", "Validate RLS coverage")
	.action(async (options) => {
		try {
			const projectKey = await getCurrentProject();
			if (!projectKey) {
				throw new Error("No project linked. Use 'switch' command first.");
			}

			if (options.check) {
				await executeOperation(projectKey, "policies");
			} else if (options.list) {
				await executeOperation(projectKey, "list-policies");
			} else if (options.apply !== undefined) {
				if (options.apply === true) {
					await executeOperation(projectKey, "apply-policies");
				} else {
					// Apply specific file - we'd need to modify executeOperation to handle this
					await executeOperation(projectKey, "apply-policy");
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
		process.stdout.write(
			chalk.blue.bold("🚀 Supabase Environment Manager\n\n")
		);

		const current = await getCurrentProject();
		if (current) {
			const project = PROJECTS[current];
			process.stdout.write(
				`Currently linked to: ${project.color(project.name)}\n\n`
			);
		}

		const mainOperation = await select({
			message: "What would you like to do?",
			choices: [
				{ name: "Switch environment", value: "switch" },
				{ name: "Run development operations", value: "dev" },
				{ name: "Run production operations", value: "prod" },
				{ name: "Show status", value: "status" },
				{ name: "Unlink current project", value: "unlink" },
				{ name: "Show help", value: "help" },
			],
		});

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
			case "help":
				program.help();
				break;
			default:
				process.stdout.write(
					chalk.red(`Unknown operation: ${mainOperation}\n`)
				);
		}
	} catch (error) {
		logger.error("Interactive mode failed", error);
		process.exit(1);
	}
});

// Error handling
process.on("unhandledRejection", (error) => {
	logger.error("Unhandled error", error);
	process.exit(1);
});

// Parse arguments - this automatically triggers interactive mode if no args
program.parse();
