import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

const databaseUrl = env.NODE_ENV === "production" ? env.PROD_DATABASE_URL : env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("Appropriate database URL is not set in environment variables.");
}

// For migrations
const migrationClient = postgres(databaseUrl, { max: 1 });

// For query purposes
const queryClient = postgres(databaseUrl, { prepare: false });

export const db = drizzle(queryClient, { schema });

// Export for migrations
export const migrationDb = drizzle(migrationClient, { schema });
