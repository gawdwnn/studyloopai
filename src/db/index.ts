import * as schema from "@/db/schema";
import { env } from "@/env";
import { databaseUrl } from "@/lib/database/db";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";
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
 * Supabase admin client instance
 */
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

/**
 * Admin Supabase client that bypasses RLS policies
 *
 * Creates a singleton Supabase client with service role authentication
 * for background jobs. This client automatically bypasses all RLS policies.
 
 * ONLY use for:
 * - Background jobs (Trigger.dev tasks)
 * - System operations without user context
 *
 * NEVER use in user-facing operations
 */
export const getAdminDatabaseAccess = (): SupabaseClient => {
	if (!supabaseAdminInstance) {
		supabaseAdminInstance = createClient(
			env.NEXT_PUBLIC_SUPABASE_URL,
			env.SUPABASE_SERVICE_ROLE_KEY,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false,
					detectSessionInUrl: false,
				},
			}
		);
	}

	return supabaseAdminInstance;
};

// USAGE

/**
 * Execute a database operation with admin privileges
 * Wrapper function for cleaner usage
 *
 * @example
 * await executeAsSupabaseAdmin(async (admin) => {
 *   return admin
 *     .from('course_materials')
 *     .update({
 *       embedding_status: 'processing',
 *       processing_started_at: new Date().toISOString()
 *     })
 *     .eq('id', materialId);
 * });
 */
export async function executeAsSupabaseAdmin<T>(
	callback: (admin: SupabaseClient) => Promise<{ data: T; error: Error }>
): Promise<T> {
	const admin = getAdminDatabaseAccess();
	const { data, error } = await callback(admin);
	if (error) {
		console.error("Supabase admin operation failed:", error);
		throw new Error(`Admin operation failed: ${error.message}`);
	}
	return data;
}

/**
 * Example usage in Trigger.dev tasks
 */
export const updateCourseMaterialStatus = async (
	materialId: string,
	status: string
) => {
	const admin = getAdminDatabaseAccess();
	const { data, error } = await admin
		.from("course_materials")
		.update({
			embedding_status: status,
			processing_started_at: new Date().toISOString(),
		})
		.eq("id", materialId)
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to update course material: ${error.message}`);
	}
	return data;
};
