import * as schema from "@/db/schema";
import { databaseUrl } from "@/lib/database/db";
import { env } from "@/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const migrationClient = postgres(databaseUrl, { max: 1 });

const queryClient = postgres(databaseUrl, { prepare: false });

export const db = drizzle(queryClient, { schema });

export const migrationDb = drizzle(migrationClient, { schema });

/**
 * Database client type for content generation functions
 */
export type DatabaseClient = typeof db;

/**
 * Admin database connection instances
 * Singleton pattern to reuse connections and prevent connection pool abuse
 */
let adminDbInstance: DatabaseClient | null = null;
let adminClientInstance: postgres.Sql | null = null;

/**
 * Admin Drizzle client that bypasses RLS policies
 * 
 * Creates a singleton Drizzle client with service role credentials for background jobs.
 * This allows Trigger.dev jobs to access RLS-protected tables.
 * 
 * Uses singleton pattern to:
 * - Prevent connection pool abuse
 * - Reuse existing connections
 * - Ensure proper resource management
 * 
 * ONLY use for:
 * - Background jobs (Trigger.dev tasks)
 * - System operations without user context
 * 
 * NEVER use in user-facing operations
 */
export const getAdminDatabaseAccess = (): DatabaseClient => {
	if (!adminDbInstance) {
		// Extract database components from Supabase URL
		const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
		const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
		
		if (!projectRef) {
			throw new Error("Invalid Supabase URL format");
		}
		
		// Build proper connection string with service role credentials
		const adminConnectionString = `postgresql://postgres:${env.SUPABASE_SERVICE_ROLE_KEY}@db.${projectRef}.supabase.co:5432/postgres`;
		
		adminClientInstance = postgres(adminConnectionString, {
			prepare: false,
			max: 5, // Limit connections for background jobs
			onnotice: () => {}, // Suppress PostgreSQL notices
			connect_timeout: 10, // 10 second connection timeout
			idle_timeout: 30, // 30 second idle timeout
		});
		
		adminDbInstance = drizzle(adminClientInstance, { schema });
	}
	
	return adminDbInstance;
};

/**
 * Cleanup function for graceful shutdown
 * Call this when shutting down the application to properly close connections
 */
export const closeAdminDatabaseAccess = async () => {
	if (adminClientInstance) {
		await adminClientInstance.end();
		adminClientInstance = null;
		adminDbInstance = null;
	}
};

