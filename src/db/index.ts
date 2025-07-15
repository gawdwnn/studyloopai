import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

function getDatabaseUrl() {
	const databaseUrl = env.NODE_ENV === "production" ? env.PROD_DATABASE_URL : env.DATABASE_URL;
	
	if (!databaseUrl) {
		throw new Error("Appropriate database URL is not set in environment variables.");
	}
	
	return databaseUrl;
}

// Lazy database connections
let queryClient: postgres.Sql | null = null;
let migrationClient: postgres.Sql | null = null;

function getQueryClient() {
	if (!queryClient) {
		queryClient = postgres(getDatabaseUrl(), { prepare: false });
	}
	return queryClient;
}

function getMigrationClient() {
	if (!migrationClient) {
		migrationClient = postgres(getDatabaseUrl(), { max: 1 });
	}
	return migrationClient;
}

export const db = drizzle(getQueryClient(), { schema });

// Export for migrations
export const migrationDb = drizzle(getMigrationClient(), { schema });
