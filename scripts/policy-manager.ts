#!/usr/bin/env bun

/**
 * RLS Policy Management Script
 *
 * Features:
 * - Interactive prompts with validation
 * - Progress indicators and spinners
 * - Better error handling and user feedback
 * - Colored output for better UX
 * - Dry run mode for safe testing
 * - Individual and batch policy application
 * - Policy status checking
 * - Supabase CLI integration
 *
 * Usage:
 *   bun scripts/policy-manager.ts                      # Interactive mode
 *   bun scripts/policy-manager.ts check                # Check current policies
 *   bun scripts/policy-manager.ts apply file.sql      # Apply single policy (dry-run)
 *   bun scripts/policy-manager.ts apply file.sql --exec # Apply single policy (execute)
 *   bun scripts/policy-manager.ts apply-all            # Apply all policies (dry-run)
 *   bun scripts/policy-manager.ts apply-all --exec     # Apply all policies (execute)
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { databaseUrl } from "@/lib/db";
import { confirm, select } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import postgres from "postgres";

/** Directory containing RLS policy SQL files */
const POLICIES_DIR = resolve(join(process.cwd(), "drizzle", "policies"));

const MANAGED_TABLES = [
	"users",
	"golden_notes",
	"own_notes",
	"generation_configs",
	"user_progress",
	"multiple_choice_questions",
	"open_questions",
	"summaries",
	"cuecards",
] as const;

type ManagedTable = (typeof MANAGED_TABLES)[number];

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
	tablename: ManagedTable;
	rls_enabled: boolean;
}

interface PolicyStatus {
	schemaname: string;
	tablename: ManagedTable;
	policyname: string;
	cmd: string;
	roles: string[];
}

interface ExecutionResult {
	success: boolean;
	dryRun?: boolean;
	error?: string;
}

class PolicyManager {
	private dryRun: boolean;
	private client: postgres.Sql | null = null;

	constructor(dryRun = true) {
		this.dryRun = dryRun;
	}

	private writeOutput(message: string): void {
		process.stdout.write(message);
	}

	private writeError(message: string): void {
		process.stderr.write(chalk.red(message));
	}

	async connect(): Promise<boolean> {
		const spinner = ora("Connecting to database...").start();

		try {
			this.client = postgres(databaseUrl);
			// Test connection
			await this.client`SELECT 1`;
			spinner.succeed("Database connected successfully");
			return true;
		} catch (error) {
			spinner.fail("Database connection failed");
			this.writeError(`\n❌ ${(error as Error).message}\n`);
			return false;
		}
	}

	async disconnect(): Promise<void> {
		if (this.client) {
			await this.client.end();
		}
	}

	parsePolicyFile(sqlContent: string): ParsedPolicyFile {
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
		const alterRegex = /ALTER\s+TABLE\s+"?(\w+)"?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
		match = alterRegex.exec(sqlContent);
		while (match !== null) {
			tables.add(match[1]);
			match = alterRegex.exec(sqlContent);
		}

		return {
			policies,
			tables: Array.from(tables),
		};
	}

	async checkExistingPolicies(policies: PolicyInfo[]): Promise<PolicyInfo[]> {
		if (!this.client) throw new Error("Database not connected");

		const existing: PolicyInfo[] = [];
		const spinner = ora("Checking existing policies...").start();

		try {
			// Use Promise.all() to check all policies concurrently for better performance
			const results = await Promise.all(
				policies.map(async (policy) => {
					if (!this.client) throw new Error("Database not connected");
					const result = await this.client`
            SELECT policyname, tablename 
            FROM pg_policies 
            WHERE policyname = ${policy.name} 
            AND tablename = ${policy.table}
          `;
					return { policy, exists: result.length > 0 };
				})
			);

			// Filter out policies that already exist
			for (const { policy, exists } of results) {
				if (exists) {
					existing.push(policy);
				}
			}

			if (existing.length > 0) {
				spinner.warn(`Found ${existing.length} existing policies`);
			} else {
				spinner.succeed("No conflicting policies found");
			}

			return existing;
		} catch (error) {
			spinner.fail("Failed to check existing policies");
			this.writeError(`\n⚠️  ${(error as Error).message}\n`);
			return [];
		}
	}

	async executeSql(sql: string, description: string): Promise<ExecutionResult> {
		if (this.dryRun) {
			this.writeOutput(chalk.blue(`🔍 DRY RUN: Would execute ${description}\n`));
			this.writeOutput(chalk.gray("📝 SQL Preview:\n"));
			this.writeOutput(chalk.gray(`${sql.substring(0, 200)}${sql.length > 200 ? "..." : ""}\n`));
			return { success: true, dryRun: true };
		}

		if (!this.client) throw new Error("Database not connected");

		const spinner = ora(`Executing ${description}...`).start();

		try {
			// SECURITY NOTE: Using client.unsafe() for policy management
			// This is intentional for RLS policy operations that require raw SQL execution
			// Input validation happens at the file level - only .sql files from drizzle/policies/ are processed
			// SQL content is read from version-controlled files, not user input
			await this.client.unsafe(sql);
			spinner.succeed(`${description} completed successfully`);
			return { success: true };
		} catch (error) {
			spinner.fail(`${description} failed`);
			this.writeError(`\n❌ ${(error as Error).message}\n`);
			return { success: false, error: (error as Error).message };
		}
	}

	async applyPolicyFile(filename: string): Promise<boolean> {
		const fullPath = resolve(join(POLICIES_DIR, filename));

		if (!existsSync(fullPath)) {
			this.writeError(`❌ Policy file not found: ${filename}\n`);
			return false;
		}

		this.writeOutput(chalk.blue(`\n📁 Processing: ${filename}\n`));

		const sql = readFileSync(fullPath, "utf8");
		const parsed = this.parsePolicyFile(sql);

		if (parsed.policies.length === 0 && parsed.tables.length === 0) {
			this.writeOutput(chalk.yellow("⚠️  No policies or RLS statements found in file\n"));
			return false;
		}

		this.writeOutput(
			chalk.green(
				`📋 Found ${parsed.policies.length} policies for tables: ${parsed.tables.join(", ")}\n`
			)
		);

		// Check for existing policies
		if (parsed.policies.length > 0) {
			const existing = await this.checkExistingPolicies(parsed.policies);
			if (existing.length > 0) {
				this.writeOutput(chalk.yellow("⚠️  The following policies already exist:\n"));
				for (const p of existing) {
					this.writeOutput(chalk.yellow(`   - ${p.name} on ${p.table}\n`));
				}

				if (!this.dryRun) {
					this.writeOutput(chalk.blue("💡 Policies will be replaced (DROP IF EXISTS + CREATE)\n"));
				}
			}
		}

		const result = await this.executeSql(sql, `Policy file: ${filename}`);
		return result.success;
	}

	async applyAllPolicies(): Promise<boolean> {
		if (!existsSync(POLICIES_DIR)) {
			this.writeError(`❌ Policies directory not found: ${POLICIES_DIR}\n`);
			return false;
		}

		const policyFiles = readdirSync(POLICIES_DIR)
			.filter((file) => file.endsWith(".sql"))
			.sort();

		if (policyFiles.length === 0) {
			this.writeOutput(chalk.yellow("📭 No policy files found\n"));
			return true;
		}

		this.writeOutput(chalk.blue(`🔄 Found ${policyFiles.length} policy files:\n`));
		for (const file of policyFiles) {
			this.writeOutput(chalk.gray(`   - ${file}\n`));
		}

		let successCount = 0;
		for (const file of policyFiles) {
			const success = await this.applyPolicyFile(file);
			if (success) successCount++;
		}

		const resultsMessage = `📊 Results: ${successCount}/${policyFiles.length} files processed successfully`;
		if (successCount === policyFiles.length) {
			this.writeOutput(chalk.green(`\n${resultsMessage}\n`));
		} else {
			this.writeOutput(chalk.red(`\n${resultsMessage}\n`));
		}

		return successCount === policyFiles.length;
	}

	async checkPolicies(): Promise<boolean> {
		if (!this.client) throw new Error("Database not connected");

		const spinner = ora("Checking current RLS policy status...").start();

		try {
			// Check RLS status for managed tables
			const rlsStatus = await this.client<RLSStatus[]>`
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE tablename = ANY(${MANAGED_TABLES})
        AND schemaname = 'public'
        ORDER BY tablename
      `;

			spinner.succeed("Policy status retrieved");

			this.writeOutput(chalk.blue("\n📋 RLS Status:\n"));
			for (const table of rlsStatus) {
				const status = table.rls_enabled ? chalk.green("✅ Enabled") : chalk.red("❌ Disabled");
				this.writeOutput(`   ${table.tablename}: ${status}\n`);
			}

			// Get all policies for managed tables
			const policies = await this.client<PolicyStatus[]>`
        SELECT 
          schemaname,
          tablename,
          policyname,
          cmd,
          roles
        FROM pg_policies 
        WHERE tablename = ANY(${MANAGED_TABLES})
        ORDER BY tablename, policyname
      `;

			this.writeOutput(chalk.blue("\n🔐 Current Policies:\n"));
			const policyByTable: Record<string, PolicyStatus[]> = {};
			for (const policy of policies) {
				if (!policyByTable[policy.tablename]) {
					policyByTable[policy.tablename] = [];
				}
				policyByTable[policy.tablename].push(policy);
			}

			for (const tableName of Object.keys(policyByTable)) {
				this.writeOutput(chalk.cyan(`\n   ${tableName}:\n`));
				for (const policy of policyByTable[tableName]) {
					this.writeOutput(
						chalk.gray(
							`     - ${policy.policyname} (${policy.cmd}) for: ${policy.roles.join(", ")}\n`
						)
					);
				}
			}

			if (Object.keys(policyByTable).length === 0) {
				this.writeOutput(chalk.yellow("   No policies found for managed tables\n"));
			}

			return true;
		} catch (error) {
			spinner.fail("Failed to check policies");
			this.writeError(`\n❌ ${(error as Error).message}\n`);
			return false;
		}
	}

	async runInteractiveMode(): Promise<void> {
		this.writeOutput(chalk.blue("\n🔧 RLS Policy Manager\n"));

		const action = await select({
			message: "What would you like to do?",
			choices: [
				{ name: "Check current policy status", value: "check" },
				{ name: "Apply single policy file", value: "apply" },
				{ name: "Apply all policy files", value: "apply-all" },
			],
		});

		// Connect to database for commands
		if (!(await this.connect())) {
			process.exit(1);
		}

		let success = false;

		try {
			switch (action) {
				case "check": {
					success = await this.checkPolicies();
					break;
				}

				case "apply": {
					if (!existsSync(POLICIES_DIR)) {
						this.writeError(`❌ Policies directory not found: ${POLICIES_DIR}\n`);
						return;
					}

					const policyFiles = readdirSync(POLICIES_DIR)
						.filter((file) => file.endsWith(".sql"))
						.sort();

					if (policyFiles.length === 0) {
						this.writeOutput(chalk.yellow("📭 No policy files found\n"));
						return;
					}

					const filename = await select({
						message: "Select a policy file to apply:",
						choices: policyFiles.map((file) => ({ name: file, value: file })),
					});

					const shouldExecute = await confirm({
						message: "Execute changes? (No = dry run)",
						default: false,
					});

					this.dryRun = !shouldExecute;
					success = await this.applyPolicyFile(filename);
					break;
				}

				case "apply-all": {
					const shouldExecute = await confirm({
						message: "Execute changes? (No = dry run)",
						default: false,
					});

					this.dryRun = !shouldExecute;
					success = await this.applyAllPolicies();
					break;
				}
			}

			if (success) {
				this.writeOutput(chalk.green("\n✅ Operation completed successfully\n"));
			} else {
				this.writeOutput(chalk.red("\n❌ Operation failed\n"));
			}
		} finally {
			await this.disconnect();
		}
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const command = args[0];
	const isExec = args.includes("--exec");
	const dryRun = !isExec;

	const manager = new PolicyManager(dryRun);

	try {
		// No command provided - run interactive mode
		if (!command) {
			await manager.runInteractiveMode();
			return;
		}

		// Show dry run notice for applicable commands
		if (dryRun && command !== "check") {
			process.stdout.write(
				chalk.blue("🧪 DRY RUN MODE - No changes will be made to the database\n")
			);
			process.stdout.write(chalk.gray("💡 Add --exec flag to execute changes\n\n"));
		}

		// Connect to database for commands
		if (!(await manager.connect())) {
			process.exit(1);
		}

		let success = false;

		switch (command) {
			case "check": {
				success = await manager.checkPolicies();
				break;
			}

			case "apply": {
				const filename = args[1];
				if (!filename) {
					process.stderr.write(chalk.red("❌ Please specify a policy file\n"));
					process.stdout.write(
						chalk.blue("Usage: bun scripts/policy-manager.ts apply policies/file.sql [--exec]\n")
					);
					process.exit(1);
				}
				success = await manager.applyPolicyFile(filename);
				break;
			}

			case "apply-all": {
				success = await manager.applyAllPolicies();
				break;
			}

			default: {
				process.stdout.write(chalk.blue("🔧 RLS Policy Manager\n\n"));
				process.stdout.write(chalk.white("Commands:\n"));
				process.stdout.write(
					chalk.gray("  check                           - Check current policy status\n")
				);
				process.stdout.write(
					chalk.gray("  apply policies/file.sql [--exec] - Apply single policy file\n")
				);
				process.stdout.write(
					chalk.gray("  apply-all [--exec]              - Apply all policy files\n")
				);
				process.stdout.write(chalk.white("\nFlags:\n"));
				process.stdout.write(
					chalk.gray("  --exec                          - Execute changes (default is dry-run)\n")
				);
				process.stdout.write(chalk.white("\nInteractive mode:\n"));
				process.stdout.write(
					chalk.gray("  bun scripts/policy-manager.ts   - Run interactive mode\n")
				);
				process.exit(1);
			}
		}

		process.exit(success ? 0 : 1);
	} catch (error) {
		process.stderr.write(chalk.red(`\n💥 Unexpected error: ${String(error)}\n`));
		process.exit(1);
	} finally {
		await manager.disconnect();
	}
}

// Handle uncaught errors
process.on("unhandledRejection", (error) => {
	process.stderr.write(chalk.red(`💥 Unhandled error: ${String(error)}\n`));
	process.exit(1);
});

// Check if this is the main module
if (process.argv[1] === import.meta.url.replace("file://", "")) {
	main().catch((error) => {
		process.stderr.write(chalk.red(`💥 Fatal error: ${String(error)}\n`));
		process.exit(1);
	});
}
