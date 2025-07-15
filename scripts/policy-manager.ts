#!/usr/bin/env bun

/**
 * RLS Policy Management Script
 *
 * Features:
 * - Dry run mode for safe testing
 * - Individual policy application
 * - Batch policy application
 * - Policy status checking
 * - Supabase CLI integration where possible
 *
 * Usage:
 *   bun scripts/policy-manager.ts check                           # Check current policies
 *   bun scripts/policy-manager.ts apply policies/file.sql        # Apply single policy (dry-run)
 *   bun scripts/policy-manager.ts apply policies/file.sql --exec # Apply single policy (execute)
 *   bun scripts/policy-manager.ts apply-all                      # Apply all policies (dry-run)
 *   bun scripts/policy-manager.ts apply-all --exec               # Apply all policies (execute)
 *   bun scripts/policy-manager.ts diff                           # Show policy differences (via Supabase CLI)
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import postgres from "postgres";
import { databaseUrl } from "@/lib/db";

const POLICIES_DIR = resolve(join(process.cwd(), "drizzle", "policies"));
const MANAGED_TABLES = [
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

	async connect(): Promise<boolean> {
		try {
			this.client = postgres(databaseUrl);
			// Test connection
			await this.client`SELECT 1`;
			return true;
		} catch (error) {
			console.error("❌ Database connection failed:", (error as Error).message);
			return false;
		}
	}

	async disconnect(): Promise<void> {
		if (this.client) {
			await this.client.end();
		}
	}

	/**
	 * Parse SQL file to extract table name and policy names
	 */
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

	/**
	 * Check if policies already exist
	 */
	async checkExistingPolicies(policies: PolicyInfo[]): Promise<PolicyInfo[]> {
		if (!this.client) throw new Error("Database not connected");

		const existing: PolicyInfo[] = [];

		for (const policy of policies) {
			try {
				const result = await this.client`
          SELECT policyname, tablename 
          FROM pg_policies 
          WHERE policyname = ${policy.name} 
          AND tablename = ${policy.table}
        `;

				if (result.length > 0) {
					existing.push(policy);
				}
			} catch (error) {
				console.warn(`⚠️  Could not check policy ${policy.name}:`, (error as Error).message);
			}
		}

		return existing;
	}

	/**
	 * Apply SQL with proper error handling
	 */
	async executeSql(sql: string, description: string): Promise<ExecutionResult> {
		if (this.dryRun) {
			console.log(`🔍 DRY RUN: Would execute ${description}`);
			console.log("📝 SQL Preview:");
			console.log(sql.substring(0, 200) + (sql.length > 200 ? "..." : ""));
			return { success: true, dryRun: true };
		}

		if (!this.client) throw new Error("Database not connected");

		try {
			await this.client.unsafe(sql);
			console.log(`✅ ${description} - executed successfully`);
			return { success: true };
		} catch (error) {
			console.error(`❌ ${description} - failed:`, (error as Error).message);
			return { success: false, error: (error as Error).message };
		}
	}

	/**
	 * Apply a single policy file
	 */
	async applyPolicyFile(filename: string): Promise<boolean> {
		const fullPath = resolve(join(POLICIES_DIR, filename));

		if (!existsSync(fullPath)) {
			console.error(`❌ Policy file not found: ${filename}`);
			return false;
		}

		console.log(`\n📁 Processing: ${filename}`);

		const sql = readFileSync(fullPath, "utf8");
		const parsed = this.parsePolicyFile(sql);

		if (parsed.policies.length === 0 && parsed.tables.length === 0) {
			console.warn("⚠️  No policies or RLS statements found in file");
			return false;
		}

		console.log(
			`📋 Found ${parsed.policies.length} policies for tables: ${parsed.tables.join(", ")}`
		);

		// Check for existing policies
		if (parsed.policies.length > 0) {
			const existing = await this.checkExistingPolicies(parsed.policies);
			if (existing.length > 0) {
				console.log("⚠️  The following policies already exist:");
				for (const p of existing) {
					console.log(`   - ${p.name} on ${p.table}`);
				}

				if (!this.dryRun) {
					console.log("💡 Policies will be replaced (DROP IF EXISTS + CREATE)");
				}
			}
		}

		const result = await this.executeSql(sql, `Policy file: ${filename}`);
		return result.success;
	}

	/**
	 * Apply all policy files
	 */
	async applyAllPolicies(): Promise<boolean> {
		if (!existsSync(POLICIES_DIR)) {
			console.error(`❌ Policies directory not found: ${POLICIES_DIR}`);
			return false;
		}

		const policyFiles = readdirSync(POLICIES_DIR)
			.filter((file) => file.endsWith(".sql"))
			.sort();

		if (policyFiles.length === 0) {
			console.log("📭 No policy files found");
			return true;
		}

		console.log(`🔄 Found ${policyFiles.length} policy files:`);
		for (const file of policyFiles) {
			console.log(`   - ${file}`);
		}

		let successCount = 0;
		for (const file of policyFiles) {
			const success = await this.applyPolicyFile(file);
			if (success) successCount++;
		}

		console.log(`\n📊 Results: ${successCount}/${policyFiles.length} files processed successfully`);
		return successCount === policyFiles.length;
	}

	/**
	 * Check current policy status
	 */
	async checkPolicies(): Promise<boolean> {
		if (!this.client) throw new Error("Database not connected");

		console.log("🔍 Checking current RLS policy status...\n");

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

			console.log("📋 RLS Status:");
			for (const table of rlsStatus) {
				const status = table.rls_enabled ? "✅ Enabled" : "❌ Disabled";
				console.log(`   ${table.tablename}: ${status}`);
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

			console.log("\n🔐 Current Policies:");
			const policyByTable: Record<string, PolicyStatus[]> = {};
			for (const policy of policies) {
				if (!policyByTable[policy.tablename]) {
					policyByTable[policy.tablename] = [];
				}
				policyByTable[policy.tablename].push(policy);
			}

			for (const tableName of Object.keys(policyByTable)) {
				console.log(`\n   ${tableName}:`);
				for (const policy of policyByTable[tableName]) {
					console.log(
						`     - ${policy.policyname} (${policy.cmd}) for: ${policy.roles.join(", ")}`
					);
				}
			}

			if (Object.keys(policyByTable).length === 0) {
				console.log("   No policies found for managed tables");
			}

			return true;
		} catch (error) {
			console.error("❌ Failed to check policies:", (error as Error).message);
			return false;
		}
	}

	/**
	 * Show policy differences using Supabase CLI (if available)
	 */
	async showPolicyDiff(): Promise<boolean> {
		try {
			console.log("🔍 Checking for schema differences using Supabase CLI...\n");

			// Check if supabase CLI is available
			execSync("which supabase", { stdio: "ignore" });

			// Run supabase db diff to show differences
			const diff = execSync("supabase db diff --schema public", {
				encoding: "utf8",
				cwd: process.cwd(),
			});

			if (diff.trim()) {
				console.log("📋 Schema differences detected:");
				console.log(diff);
			} else {
				console.log("✅ No schema differences detected");
			}

			return true;
		} catch {
			console.warn("⚠️  Supabase CLI not available or not linked to a project");
			console.log(
				"💡 To use diff functionality, run: supabase link --project-ref your-project-ref"
			);
			return false;
		}
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const command = args[0];
	const isExec = args.includes("--exec");
	const dryRun = !isExec;

	if (dryRun && command !== "check" && command !== "diff") {
		console.log("🧪 DRY RUN MODE - No changes will be made to the database");
		console.log("💡 Add --exec flag to execute changes\n");
	}

	const manager = new PolicyManager(dryRun);

	// Commands that don't require database connection
	if (command === "diff") {
		const success = await manager.showPolicyDiff();
		process.exit(success ? 0 : 1);
	}

	// Connect to database for other commands
	if (!(await manager.connect())) {
		process.exit(1);
	}

	try {
		let success = false;

		switch (command) {
			case "check": {
				success = await manager.checkPolicies();
				break;
			}

			case "apply": {
				const filename = args[1];
				if (!filename) {
					console.error("❌ Please specify a policy file");
					console.log("Usage: bun scripts/policy-manager.ts apply policies/file.sql [--exec]");
					process.exit(1);
				}
				success = await manager.applyPolicyFile(filename);
				break;
			}

			case "apply-all": {
				success = await manager.applyAllPolicies();
				break;
			}

			default:
				console.log("🔧 RLS Policy Manager (TypeScript)\n");
				console.log("Commands:");
				console.log("  check                           - Check current policy status");
				console.log("  apply policies/file.sql [--exec] - Apply single policy file");
				console.log("  apply-all [--exec]              - Apply all policy files");
				console.log("  diff                            - Show schema differences (Supabase CLI)");
				console.log("\nFlags:");
				console.log("  --exec                          - Execute changes (default is dry-run)");
				process.exit(1);
		}

		process.exit(success ? 0 : 1);
	} finally {
		await manager.disconnect();
	}
}

// Handle uncaught errors
process.on("unhandledRejection", (error) => {
	console.error("💥 Unhandled error:", error);
	process.exit(1);
});

main().catch(console.error);
