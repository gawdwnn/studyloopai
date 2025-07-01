import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set in src/db/index.ts");
}

// For migrations
const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });

// For query purposes
const queryClient = postgres(process.env.DATABASE_URL, { prepare: false });

export const db = drizzle(queryClient, { schema });

// Export for migrations
export const migrationDb = drizzle(migrationClient, { schema });
