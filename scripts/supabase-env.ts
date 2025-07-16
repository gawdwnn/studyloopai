#!/usr/bin/env bun

/**
 * Supabase Environment Management Script
 *
 * IMPORTANT: This script operates ONLY on remote Supabase projects.
 * All operations target the linked remote project, not local containers.
 *
 * Features:
 * - Interactive environment switching (dev/prod)
 * - Progress indicators and spinners
 * - Production safety confirmations
 * - Database operations (migrations, policies, types)
 * - Colored output for better UX
 * - Automatic backups for production operations
 * - Remote project validation before operations
 *
 * Usage:
 *   bun scripts/supabase-env.ts                    # Interactive mode
 *   bun scripts/supabase-env.ts dev               # Switch to development
 *   bun scripts/supabase-env.ts prod              # Switch to production
 *   bun scripts/supabase-env.ts switch            # Environment switcher
 *   bun scripts/supabase-env.ts status            # Show current status
 */

import { env } from "@/env";
import { confirm, input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { execa } from "execa";
import ora from "ora";

// Project configurations
const PROJECTS = {
	dev: {
		ref: env.SUPABASE_DEV_PROJECT_REF || "iyoalhewbrqbncceziec",
		name: "studyloopai-dev",
		environment: "development",
		color: chalk.blue,
	},
	prod: {
		ref: env.SUPABASE_PROD_PROJECT_REF || "anitoreuxwosqotmscub",
		name: "studyloopai-prod",
		environment: "production",
		color: chalk.red,
	},
} as const;

type ProjectKey = keyof typeof PROJECTS;

class SupabaseEnvManager {
	private async getCurrentProject(): Promise<ProjectKey | null> {
		try {
			const { stdout } = await execa("npx", ["supabase", "projects", "list", "--output", "json"]);
			const projects = JSON.parse(stdout);
			const linkedProject = projects.find(
				(p: { linked: boolean; id: string }) => p.linked === true
			);

			if (!linkedProject) return null;

			const currentRef = linkedProject.id;
			if (currentRef === PROJECTS.dev.ref) return "dev";
			if (currentRef === PROJECTS.prod.ref) return "prod";
			return null;
		} catch {
			return null;
		}
	}

	private async ensureRemoteProject(): Promise<void> {
		const current = await this.getCurrentProject();
		if (!current) {
			throw new Error(
				"No remote Supabase project is currently linked. " +
					"Please link a project first using 'bun scripts/supabase-env.ts switch'"
			);
		}
	}

	private async linkProject(projectKey: ProjectKey): Promise<void> {
		const project = PROJECTS[projectKey];
		const spinner = ora(`Linking to ${project.name}...`).start();

		try {
			await execa("npx", ["supabase", "link", "--project-ref", project.ref]);
			spinner.succeed(`Successfully linked to ${project.color(project.name)}`);
		} catch (error) {
			spinner.fail(`Failed to link to ${project.name}`);
			throw error;
		}
	}

	private async runCommand(command: string, args: string[], description: string): Promise<void> {
		const spinner = ora(description).start();

		try {
			await execa(command, args, { stdio: "inherit" });
			spinner.succeed(`${description} completed`);
		} catch (error) {
			spinner.fail(`${description} failed`);
			throw error;
		}
	}

	private async confirmProduction(): Promise<boolean> {
		process.stdout.write(chalk.red.bold("\n🚨 PRODUCTION ENVIRONMENT\n"));
		process.stdout.write(
			chalk.yellow("You are about to perform operations on the PRODUCTION database.\n")
		);
		process.stdout.write(chalk.yellow("This can affect live users and data.\n\n"));

		const confirmation = await input({
			message: 'Type "PRODUCTION" to confirm:',
			validate: (value) => value === "PRODUCTION" || 'You must type "PRODUCTION" to continue',
		});

		return confirmation === "PRODUCTION";
	}

	async switch(targetProject?: ProjectKey): Promise<void> {
		const current = await this.getCurrentProject();

		let selectedProject = targetProject;
		if (!selectedProject) {
			const currentDisplay = current ? PROJECTS[current].name : "None";
			process.stdout.write(chalk.blue("\n📊 Current Supabase Project Status\n"));
			process.stdout.write(`Current: ${currentDisplay}\n\n`);

			selectedProject = await select({
				message: "Select target environment:",
				choices: [
					{ name: `${PROJECTS.dev.name} (Development)`, value: "dev" },
					{ name: `${PROJECTS.prod.name} (Production)`, value: "prod" },
				],
			});
		}

		if (current === selectedProject) {
			process.stdout.write(
				chalk.green(`✓ Already connected to ${PROJECTS[selectedProject].name}\n`)
			);
			return;
		}

		if (selectedProject === "prod") {
			const confirmed = await this.confirmProduction();
			if (!confirmed) {
				process.stdout.write(chalk.yellow("Operation cancelled\n"));
				return;
			}
		}

		await this.linkProject(selectedProject);
	}

	async runOperations(projectKey: ProjectKey): Promise<void> {
		// Ensure we're operating on a remote project
		await this.ensureRemoteProject();

		const project = PROJECTS[projectKey];
		const isProduction = projectKey === "prod";

		process.stdout.write(project.color(`\n🔧 ${project.name} Environment (Remote)\n`));

		const operations = [
			{ name: "Generate migrations", value: "generate", safe: true },
			{ name: "Apply migrations", value: "migrate", safe: false },
			{ name: "Check RLS policies", value: "policies", safe: true },
			{ name: "Apply RLS policies", value: "apply-policies", safe: false },
			{ name: "Generate TypeScript types", value: "types", safe: true },
			{ name: "Open Drizzle Studio", value: "studio", safe: true },
			{ name: "View recent logs", value: "logs", safe: true },
			...(isProduction ? [{ name: "Create backup", value: "backup", safe: true }] : []),
			{ name: "Run complete setup", value: "setup", safe: false },
		];

		const selectedOps = await select({
			message: "Select operations to run:",
			choices: operations.map((op) => ({
				name: `${op.name} ${op.safe ? chalk.green("(SAFE)") : chalk.red("(DESTRUCTIVE)")}`,
				value: op.value,
			})),
		});

		const selectedOperation = operations.find((op) => op.value === selectedOps);
		if (!selectedOperation?.safe && isProduction) {
			const confirmed = await confirm({
				message: `Are you sure you want to run ${selectedOps} on production?`,
			});
			if (!confirmed) {
				process.stdout.write(chalk.yellow("Operation cancelled\n"));
				return;
			}
		}

		await this.executeOperation(selectedOps, isProduction);
	}

	private async executeOperation(operation: string, isProduction: boolean): Promise<void> {
		const backupFile = `backup-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.sql`;

		switch (operation) {
			case "generate": {
				await this.runCommand("bun", ["run", "db:generate"], "Generating migrations");
				break;
			}

			case "migrate": {
				if (isProduction) {
					await this.runCommand(
						"npx",
						["supabase", "db", "dump", "--file", backupFile],
						"Creating backup"
					);
				}
				await this.runCommand("bun", ["run", "db:migrate"], "Applying migrations");
				break;
			}

			case "policies": {
				await this.runCommand(
					"bun",
					["scripts/policy-manager.ts", "check"],
					"Checking RLS policies"
				);
				break;
			}

			case "apply-policies": {
				await this.runCommand(
					"bun",
					["scripts/policy-manager.ts", "apply-all", "--exec"],
					"Applying RLS policies"
				);
				break;
			}

			case "types": {
				const typeFile = isProduction ? "src/types/supabase-prod.ts" : "src/types/supabase.ts";
				await this.runCommand(
					"sh",
					["-c", `npx supabase gen types typescript --linked > ${typeFile}`],
					"Generating TypeScript types"
				);
				break;
			}

			case "studio": {
				await this.runCommand("bun", ["run", "db:studio"], "Opening Drizzle Studio");
				break;
			}

			case "logs": {
				await this.runCommand(
					"npx",
					["supabase", "logs", "--level", "info"],
					"Viewing recent logs"
				);
				break;
			}

			case "backup": {
				await this.runCommand(
					"npx",
					["supabase", "db", "dump", "--file", backupFile],
					"Creating backup"
				);
				break;
			}

			case "setup": {
				if (isProduction) {
					await this.runCommand(
						"npx",
						["supabase", "db", "dump", "--file", backupFile],
						"Creating backup"
					);
				}
				await this.runCommand("bun", ["run", "db:generate"], "Generating migrations");
				await this.runCommand("bun", ["run", "db:migrate"], "Applying migrations");
				await this.runCommand(
					"bun",
					["scripts/policy-manager.ts", "apply-all", "--exec"],
					"Applying RLS policies"
				);
				const setupTypeFile = isProduction ? "src/types/supabase-prod.ts" : "src/types/supabase.ts";
				await this.runCommand(
					"sh",
					["-c", `npx supabase gen types typescript --linked > ${setupTypeFile}`],
					"Generating TypeScript types"
				);
				break;
			}

			default: {
				process.stdout.write(chalk.red(`Unknown operation: ${operation}\n`));
			}
		}
	}

	async status(): Promise<void> {
		const current = await this.getCurrentProject();

		process.stdout.write(chalk.blue("\n📊 Current Supabase Project Status (Remote)\n"));

		if (current) {
			const project = PROJECTS[current];
			process.stdout.write(`Environment: ${project.color(project.environment)}\n`);
			process.stdout.write(`Project: ${project.name}\n`);
			process.stdout.write(`Reference: ${project.ref}\n`);
			process.stdout.write(chalk.green("✓ Remote project linked\n"));

			if (current === "prod") {
				process.stdout.write(chalk.yellow("⚠️  You are in production mode\n"));
			}
		} else {
			process.stdout.write(chalk.yellow("No remote project currently linked\n"));
			process.stdout.write(
				chalk.gray("Use 'bun scripts/supabase-env.ts switch' to link a project\n")
			);
		}

		process.stdout.write(chalk.blue("\nAvailable Projects:\n"));
		for (const [key, project] of Object.entries(PROJECTS)) {
			const indicator = current === key ? "●" : "○";
			process.stdout.write(`${indicator} ${project.name} (${project.environment})\n`);
		}
	}
}

async function main() {
	const manager = new SupabaseEnvManager();
	const args = process.argv.slice(2);
	const command = args[0];
	const subcommand = args[1];

	try {
		switch (command) {
			case "switch": {
				await manager.switch(subcommand as ProjectKey);
				break;
			}

			case "dev": {
				await manager.switch("dev");
				if (subcommand) {
					await manager.runOperations("dev");
				}
				break;
			}

			case "prod": {
				await manager.switch("prod");
				if (subcommand) {
					await manager.runOperations("prod");
				}
				break;
			}

			case "status": {
				await manager.status();
				break;
			}

			default: {
				const action = await select({
					message: "What would you like to do?",
					choices: [
						{ name: "Switch environment", value: "switch" },
						{ name: "Run development operations", value: "dev" },
						{ name: "Run production operations", value: "prod" },
						{ name: "Show status", value: "status" },
					],
				});

				switch (action) {
					case "switch": {
						await manager.switch();
						break;
					}
					case "dev": {
						await manager.switch("dev");
						await manager.runOperations("dev");
						break;
					}
					case "prod": {
						await manager.switch("prod");
						await manager.runOperations("prod");
						break;
					}
					case "status": {
						await manager.status();
						break;
					}
				}
			}
		}
	} catch (error) {
		process.stderr.write(chalk.red(`\n❌ Operation failed: ${String(error)}\n`));
		process.exit(1);
	}
}

// Check if this is the main module
if (process.argv[1] === import.meta.url.replace("file://", "")) {
	main().catch((error) => {
		process.stderr.write(chalk.red(`\n💥 Fatal error: ${String(error)}\n`));
		process.exit(1);
	});
}
